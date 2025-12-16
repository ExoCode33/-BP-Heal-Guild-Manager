import pg from 'pg';
const { Pool } = pg;

/**
 * Database Connection Pool
 * 
 * Manages PostgreSQL connections efficiently with pooling.
 * This replaces individual client connections with a reusable pool.
 * 
 * Features:
 * - Connection reuse (faster queries)
 * - Automatic connection management
 * - Error handling and recovery
 * - Configurable pool size
 */

class DatabasePool {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the connection pool
   */
  initialize() {
    if (this.isInitialized) {
      return this.pool;
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      
      // Pool configuration
      max: 20,                      // Maximum pool size
      min: 2,                       // Minimum pool size
      idleTimeoutMillis: 30000,     // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Timeout if can't connect in 2s
      
      // SSL configuration for production (Railway, Heroku, etc.)
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    // Handle pool errors
    this.pool.on('error', (err, client) => {
      console.error('[DATABASE POOL] Unexpected error on idle client', err);
      if (global.logger) {
        global.logger.logError('Database', 'Pool error', err);
      }
    });

    // Handle new connections
    this.pool.on('connect', (client) => {
      console.log('[DATABASE POOL] New client connected');
    });

    // Handle connection removal
    this.pool.on('remove', (client) => {
      console.log('[DATABASE POOL] Client removed from pool');
    });

    this.isInitialized = true;
    console.log('[DATABASE POOL] Initialized with max connections: 20');

    return this.pool;
  }

  /**
   * Get the pool instance
   */
  getPool() {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return this.pool;
  }

  /**
   * Execute a query using the pool
   */
  async query(text, params) {
    const pool = this.getPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 100) {
        console.warn(`[DATABASE POOL] Slow query (${duration}ms): ${text.substring(0, 50)}...`);
      }
      
      return result;
    } catch (error) {
      console.error('[DATABASE POOL] Query error:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool (for transactions)
   */
  async getClient() {
    const pool = this.getPool();
    return await pool.connect();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const pool = this.getPool();
    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  async close() {
    if (this.pool) {
      console.log('[DATABASE POOL] Closing all connections...');
      await this.pool.end();
      this.isInitialized = false;
      console.log('[DATABASE POOL] All connections closed');
    }
  }
}

// Export singleton instance
export default new DatabasePool();
