const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'API Gateway',
        message: 'Sistem Pemesanan UMKM',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`API Gateway berjalan di port ${PORT}`);
});