const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;

const SERVICES = {
    auth: 'http://localhost:8001',
    produk: 'http://localhost:8080',     // CI4 default port 8080
    order: 'http://localhost:8002'
};

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 menit
    max: 60,
    message: { error: 'Terlalu banyak request, coba lagi nanti.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Terapkan rate limiting ke semua request
app.use(limiter);

const JWT_SECRET = 'rahasia_jwt_uts_2410511062';

const verifyJWT = (req, res, next) => {
    // Endpoint yang tidak butuh autentikasi
    const publicPaths = [
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/google',
        '/api/auth/google/callback',
        '/api/produk',      // GET produk bebas akses
        '/api/produk/'
    ];
    
    const isPublic = publicPaths.some(path => req.path.startsWith(path));
    if (isPublic) {
        return next();
    }
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak disertakan.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
    }
};

// Terapkan JWT validation ke semua request (kecuali yang dikecualikan)
app.use(verifyJWT);

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'API Gateway',
        message: 'Sistem Pemesanan UMKM',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', createProxyMiddleware({
    target: SERVICES.auth,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': '/api/auth'
    },
    onError: (err, req, res) => {
        console.error('Auth service error:', err);
        res.status(503).json({ error: 'Auth service tidak tersedia' });
    }
}));

app.use('/api/produk', createProxyMiddleware({
    target: SERVICES.produk,
    changeOrigin: true,
    pathRewrite: {
        '^/api/produk': '/produk'  // CI4 routing tanpa /api prefix
    },
    onError: (err, req, res) => {
        console.error('Produk service error:', err);
        res.status(503).json({ error: 'Produk service tidak tersedia' });
    }
}));

app.use('/api/order', createProxyMiddleware({
    target: SERVICES.order,
    changeOrigin: true,
    pathRewrite: {
        '^/api/order': '/api'
    },
    onError: (err, req, res) => {
        console.error('Order service error:', err);
        res.status(503).json({ error: 'Order service tidak tersedia' });
    }
}));

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
    console.log(`
      API GATEWAY BERJALAN              
     Port: ${PORT}                            
     Auth Service: ${SERVICES.auth}     
     Produk Service: ${SERVICES.produk}  
     Order Service: ${SERVICES.order}    
    `);
});