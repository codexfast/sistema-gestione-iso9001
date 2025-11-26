/**
 * Database Connection Pool - SQL Server
 * Sistema Gestione ISO 9001
 */

const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

/**
 * Ottieni connection pool (singleton)
 */
async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      logger.info('✅ SQL Server connection pool established');
      
      // Handle pool errors
      pool.on('error', (err) => {
        logger.error('SQL Pool Error:', err);
        pool = null;
      });
    } catch (err) {
      logger.error('❌ Failed to connect to SQL Server:', err);
      throw err;
    }
  }
  return pool;
}

/**
 * Esegui query con gestione errori
 */
async function query(queryText, params = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Bind parameters
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.query(queryText);
    return result;
  } catch (err) {
    logger.error('Database query error:', { query: queryText, error: err.message });
    throw err;
  }
}

/**
 * Esegui stored procedure
 */
async function execute(procedureName, params = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Bind parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value.isOutput) {
        request.output(key, value.type);
      } else {
        request.input(key, value);
      }
    });
    
    const result = await request.execute(procedureName);
    return result;
  } catch (err) {
    logger.error('Stored procedure error:', { procedure: procedureName, error: err.message });
    throw err;
  }
}

/**
 * Chiudi connection pool
 */
async function closePool() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      logger.info('SQL Server connection pool closed');
    } catch (err) {
      logger.error('Error closing SQL pool:', err);
    }
  }
}

/**
 * Health check database
 */
async function healthCheck() {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS health');
    return { healthy: true, message: 'Database connection OK' };
  } catch (err) {
    return { healthy: false, message: err.message };
  }
}

module.exports = {
  sql,
  getPool,
  query,
  execute,
  closePool,
  healthCheck,
};
