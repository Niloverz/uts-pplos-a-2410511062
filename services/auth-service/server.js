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

app.listen(PORT, () => {
    console.log(`🔐 Auth Service berjalan di port ${PORT}`);
});