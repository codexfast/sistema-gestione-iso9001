/**
 * Logger Utility - Winston
 * Sistema Gestione ISO 9001
 */

const winston = require('winston');
const path = require('path');

// Formato log personalizzato
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        const log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        return stack ? `${log}\n${stack}` : log;
    })
);

// Configurazione logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // File errors
        new winston.transports.File({
            filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File combined
        new winston.transports.File({
            filename: path.join(__dirname, '..', '..', 'logs', 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

module.exports = logger;
