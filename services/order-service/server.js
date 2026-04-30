const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'order_db',
};

let pool;

async function initDb() {
    pool = mysql.createPool(dbConfig);

    // Tabel keranjang
    const createCartTable = `
        CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            produk_id INT NOT NULL,
            nama_produk VARCHAR(255) NOT NULL,
            harga INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Tabel pesanan
    const createOrderTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_code VARCHAR(50) UNIQUE NOT NULL,
            user_id INT,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255),
            total_harga INT NOT NULL,
            status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Tabel detail pesanan
    const createOrderItemTable = `
        CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            produk_id INT NOT NULL,
            nama_produk VARCHAR(255) NOT NULL,
            harga INT NOT NULL,
            quantity INT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `;

    await pool.execute(createCartTable);
    await pool.execute(createOrderTable);
    await pool.execute(createOrderItemTable);
    console.log('✅ Database order_db siap');
}

initDb().catch(console.error);

// GET /cart/:session_id - Lihat isi keranjang
app.get('/api/cart/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        const [rows] = await pool.execute(
            'SELECT * FROM cart WHERE session_id = ?',
            [session_id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /cart - Tambah item ke keranjang
app.post('/api/cart', async (req, res) => {
    try {
        const { session_id, produk_id, nama_produk, harga, quantity } = req.body;

        if (!session_id || !produk_id || !nama_produk || !harga) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        // Cek apakah item sudah ada di keranjang
        const [existing] = await pool.execute(
            'SELECT * FROM cart WHERE session_id = ? AND produk_id = ?',
            [session_id, produk_id]
        );

        if (existing.length > 0) {
            // Update quantity
            const newQuantity = existing[0].quantity + (quantity || 1);
            await pool.execute(
                'UPDATE cart SET quantity = ? WHERE session_id = ? AND produk_id = ?',
                [newQuantity, session_id, produk_id]
            );
        } else {
            // Insert baru
            await pool.execute(
                'INSERT INTO cart (session_id, produk_id, nama_produk, harga, quantity) VALUES (?, ?, ?, ?, ?)',
                [session_id, produk_id, nama_produk, harga, quantity || 1]
            );
        }

        res.status(201).json({ message: 'Item berhasil ditambahkan ke keranjang' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /cart/:session_id/:produk_id - Hapus item dari keranjang
app.delete('/api/cart/:session_id/:produk_id', async (req, res) => {
    try {
        const { session_id, produk_id } = req.params;
        await pool.execute(
            'DELETE FROM cart WHERE session_id = ? AND produk_id = ?',
            [session_id, produk_id]
        );
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /cart/:session_id/:produk_id - Update quantity
app.put('/api/cart/:session_id/:produk_id', async (req, res) => {
    try {
        const { session_id, produk_id } = req.params;
        const { quantity } = req.body;

        if (quantity <= 0) {
            await pool.execute(
                'DELETE FROM cart WHERE session_id = ? AND produk_id = ?',
                [session_id, produk_id]
            );
        } else {
            await pool.execute(
                'UPDATE cart SET quantity = ? WHERE session_id = ? AND produk_id = ?',
                [quantity, session_id, produk_id]
            );
        }

        res.json({ message: 'Keranjang berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /cart/clear/:session_id - Kosongkan keranjang
app.delete('/api/cart/clear/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        await pool.execute('DELETE FROM cart WHERE session_id = ?', [session_id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// POST /checkout - Checkout dari keranjang
app.post('/api/checkout', async (req, res) => {
    try {
        const { session_id, customer_name, customer_email, user_id } = req.body;

        if (!session_id || !customer_name) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        // Ambil isi keranjang
        const [cartItems] = await pool.execute(
            'SELECT * FROM cart WHERE session_id = ?',
            [session_id]
        );

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Keranjang kosong' });
        }

        // Hitung total harga
        const total_harga = cartItems.reduce((sum, item) => sum + (item.harga * item.quantity), 0);

        // Generate order code
        const order_code = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Simpan ke tabel orders
        const [orderResult] = await pool.execute(
            'INSERT INTO orders (order_code, user_id, customer_name, customer_email, total_harga) VALUES (?, ?, ?, ?, ?)',
            [order_code, user_id || null, customer_name, customer_email || null, total_harga]
        );

        const order_id = orderResult.insertId;

        // Simpan ke tabel order_items
        for (const item of cartItems) {
            await pool.execute(
                'INSERT INTO order_items (order_id, produk_id, nama_produk, harga, quantity) VALUES (?, ?, ?, ?, ?)',
                [order_id, item.produk_id, item.nama_produk, item.harga, item.quantity]
            );
        }

        // Kosongkan keranjang
        await pool.execute('DELETE FROM cart WHERE session_id = ?', [session_id]);

        res.status(201).json({
            message: 'Checkout berhasil',
            order_code: order_code,
            total_harga: total_harga
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /orders - Lihat semua pesanan
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT o.*, 
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_item
            FROM orders o 
            ORDER BY o.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /orders/:id - Detail pesanan
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [order] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
        if (order.length === 0) {
            return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
        }

        const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);

        res.json({
            ...order[0],
            items: items
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /orders/:id/status - Update status pesanan
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatus = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ error: 'Status tidak valid' });
        }

        await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Status pesanan berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Order Service berjalan di port ${PORT}`);
});