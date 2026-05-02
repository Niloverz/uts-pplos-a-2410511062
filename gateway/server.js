const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 8000;

app.use(express.json());

// Service endpoints
const SERVICES = {
    auth: 'http://localhost:8001',
    produk: 'http://localhost:8080',
    order: 'http://localhost:8002'
};

// Helper untuk forward request (tanpa proxy middleware)
const forwardRequest = async (req, res, targetUrl) => {
    try {
        const options = {
            method: req.method,
            url: targetUrl,
            headers: {
                'Content-Type': 'application/json',
                ...(req.headers.authorization && { 
                    Authorization: req.headers.authorization 
                })
            },
            data: req.body
        };
        
        const response = await axios(options);
        res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ 
                error: 'Service tidak tersedia',
                detail: error.message 
            });
        }
    }
};

// ============ ROUTING KE SERVICE (tanpa wildcard *) ============

// Auth service (login, register, dll)
app.post('/api/auth/login', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.auth}/api/auth/login`);
});

app.post('/api/auth/register', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.auth}/api/auth/register`);
});

app.post('/api/auth/refresh', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.auth}/api/auth/refresh`);
});

app.post('/api/auth/logout', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.auth}/api/auth/logout`);
});

app.get('/api/auth/profile', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.auth}/api/auth/profile`);
});

// Produk service (CI4)
app.get('/api/products', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.produk}/products`);
});

app.get('/api/products/:id', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.produk}/products/${req.params.id}`);
});

app.post('/api/products', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.produk}/products`);
});

app.put('/api/products/:id', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.produk}/products/${req.params.id}`);
});

app.delete('/api/products/:id', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.produk}/products/${req.params.id}`);
});

// Order service (cart & orders)
app.get('/api/cart/:session_id', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/cart/${req.params.session_id}`);
});

app.post('/api/cart', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/cart`);
});

app.delete('/api/cart/:session_id/:produk_id', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/cart/${req.params.session_id}/${req.params.produk_id}`);
});

app.post('/api/checkout', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/checkout`);
});

app.get('/api/orders', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/orders`);
});

app.get('/api/orders/:id', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/orders/${req.params.id}`);
});

app.put('/api/orders/:id/status', async (req, res) => {
    await forwardRequest(req, res, `${SERVICES.order}/api/orders/${req.params.id}/status`);
});

// Health check gateway
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'API Gateway',
        message: 'Sistem Pemesanan UMKM',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth/*',
            produk: '/api/products',
            order: '/api/cart/*, /api/orders/*'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Endpoint ${req.method} ${req.url} tidak ditemukan` });
});

app.listen(PORT, () => {
    console.log(` API Gateway berjalan di port ${PORT}`);
    console.log(`   Auth -> ${SERVICES.auth}`);
    console.log(`   Produk -> ${SERVICES.produk}`);
    console.log(`   Order -> ${SERVICES.order}`);
});