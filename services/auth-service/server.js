require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`Auth Service berjalan di port ${PORT}`);
});