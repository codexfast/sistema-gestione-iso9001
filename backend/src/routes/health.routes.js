/**
 * Health Routes
 * Endpoint per health check (usato da ConnectionStatus, monitoring, load balancers)
 * Sistema Gestione ISO 9001 - QS Studio
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/v1/health
 * Health check endpoint (NO AUTH REQUIRED - public)
 * Ritorna status server + uptime
 * @route GET /api/v1/health
 * @access Public
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(), // secondi
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

/**
 * GET /api/v1/health/ready
 * Readiness check (DB connessione + dipendenze critiche)
 * @route GET /api/v1/health/ready
 * @access Public
 */
router.get('/health/ready', async (req, res) => {
    try {
        // TODO: Aggiungere check DB connection
        // const { query } = require('../db/connection');
        // await query('SELECT 1');

        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'ok' // Placeholder - sostituire con vera verifica
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;
