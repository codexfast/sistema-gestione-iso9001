/**
 * Express Server - Backend API Sistema Gestione ISO 9001
 * Port: 10443 (HTTPS)
 */

require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { closePool } = require('./config/database');

// Import routes
const checklistRoutes = require('./routes/checklist.routes');
// TODO: Implementare dopo test checklist
// const authRoutes = require('./routes/auth.routes');
// const auditRoutes = require('./routes/audit.routes');
// const attachmentRoutes = require('./routes/attachment.routes');
// const ncRoutes = require('./routes/nc.routes');
// const syncRoutes = require('./routes/sync.routes');

const app = express();
const PORT = process.env.PORT || 10443;

// ==========================================
// MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Configurare in produzione
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression
app.use(compression());

// CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN.split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Troppi request da questo IP, riprova più tardi',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// ==========================================
// ROUTES
// ==========================================

app.get('/', (req, res) => {
    res.json({
        name: 'SGQ ISO 9001 API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

// Health check
app.get('/health', async (req, res) => {
    const { healthCheck } = require('./config/database');
    const dbHealth = await healthCheck();

    res.json({
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        database: dbHealth,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// API routes
const API_BASE = process.env.API_BASE_PATH || '/api/v1';
app.use(API_BASE, checklistRoutes);
// TODO: Abilitare dopo implementazione
// app.use(`${API_BASE}/auth`, authRoutes);
// app.use(`${API_BASE}/audits`, auditRoutes);
// app.use(`${API_BASE}/attachments`, attachmentRoutes);
// app.use(`${API_BASE}/non-conformities`, ncRoutes);
// app.use(`${API_BASE}/sync`, syncRoutes);

// Static files (uploads)
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint non trovato' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Errore interno del server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ==========================================
// SERVER STARTUP
// ==========================================

function startServer() {
    if (process.env.SSL_ENABLED === 'true') {
        // HTTPS Server
        const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
        const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
        const credentials = { key: privateKey, cert: certificate };

        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(PORT, () => {
            logger.info(`🔒 HTTPS Server running on https://www.fr-busato.it:${PORT}`);
        });
    } else {
        // HTTP Server (development)
        app.listen(PORT, () => {
            logger.info(`🚀 HTTP Server running on http://localhost:${PORT}`);
        });
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing server...');
    await closePool();
    process.exit(0);
});

// Start
startServer();

module.exports = app;
