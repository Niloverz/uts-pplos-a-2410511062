require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

const blacklistedTokens = new Set();

// Konfigurasi database (XAMPP default)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'auth_db',
};

let pool;

async function initDb() {
    pool = mysql.createPool(dbConfig);
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            name VARCHAR(255),
            avatar_url TEXT,
            oauth_provider VARCHAR(50),
            oauth_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await pool.execute(createTableQuery);
    console.log('Database auth_db siap');
}

initDb().catch(console.error);

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
            [email, hashedPassword, name || email.split('@')[0]]
        );
        
        res.status(201).json({ message: 'User berhasil dibuat', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Email sudah terdaftar' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi' });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND oauth_provider IS NULL',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        const JWT_SECRET = 'rahasia_jwt_uts_2410511062';
        const JWT_REFRESH_SECRET = 'refresh_rahasia_jwt_uts_2410511062';

        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token wajib disertakan' });
        }

        const JWT_REFRESH_SECRET = 'refresh_rahasia_jwt_uts_2410511062';
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'User tidak ditemukan' });
        }

        const JWT_SECRET = 'rahasia_jwt_uts_2410511062';
        const newAccessToken = jwt.sign(
            { userId: rows[0].id, email: rows[0].email },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(401).json({ error: 'Refresh token tidak valid atau expired' });
    }
});

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak disertakan.' });
    }

    try {
        const JWT_SECRET = 'rahasia_jwt_uts_2410511062';
        const decoded = jwt.verify(token, JWT_SECRET);

          if (blacklistedTokens.has(token)) {
            return res.status(401).json({ error: 'Token sudah logout' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
    }
};

// Contoh endpoint terproteksi (test middleware)
app.get('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, email, name, avatar_url FROM users WHERE id = ?', [req.user.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/logout', verifyToken, async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        blacklistedTokens.add(token);
        // Hapus dari blacklist setelah 15 menit (masa berlaku token)
        setTimeout(() => blacklistedTokens.delete(token), 15 * 60 * 1000);
    }
    
    res.status(204).send();
});

app.listen(PORT, () => {
    console.log(`Auth Service berjalan di port ${PORT}`);
});