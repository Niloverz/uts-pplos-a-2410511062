require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

app.listen(PORT, () => {
    console.log(`🔐 Auth Service berjalan di port ${PORT}`);
});