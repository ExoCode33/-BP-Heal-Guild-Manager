/**
 * Discord API Batcher
 * 
 * Batches and debounces Discord API calls to prevent rate limiting
 * and improve performance when fetching multiple resources.
 * 
 * Features:
 * - Automatic batching
 * - Debouncing
 * - Rate limit prevention
 * - Error handling per request
 */

class DiscordBatcher {
  constructor() {
    this.userQueue = [];
    this.memberQueue = [];
    this.channelQueue = [];
    this.roleQueue = [];
    
    this.processing = {
      users: false,
      members: false,
      channels: false,
      roles: false
    };
    
    this.config = {
      batchDelay: 100,        // 100ms debounce
      batchSize: 10,          // Process 10 at a time
      requestDelay: 50        // 50ms between batches
    };
    
    this.stats = {
      users: { batched: 0, errors: 0 },
      members: { batched: 0, errors: 0 },
      channels: { batched: 0, errors: 0 },
      roles: { batched: 0, errors: 0 }
    };
  }

  // ============================================================================
  // USER FETCHING
  // ============================================================================

  /**
   * Fetch a user (batched)
   */
  async fetchUser(client, userId) {
    return new Promise((resolve, reject) => {
      this.userQueue.push({ client, userId, resolve, reject });
      this.scheduleBatch('users');
    });
  }

  /**
   * Fetch multiple users (batched)
   */
  async fetchUsers(client, userIds) {
    return Promise.all(
      userIds.map(userId => this.fetchUser(client, userId))
    );
  }

  // ============================================================================
  // MEMBER FETCHING
  // ============================================================================

  /**
   * Fetch a guild member (batched)
   */
  async fetchMember(guild, userId) {
    return new Promise((resolve, reject) => {
      this.memberQueue.push({ guild, userId, resolve, reject });
      this.scheduleBatch('members');
    });
  }

  /**
   * Fetch multiple guild members (batched)
   */
  async fetchMembers(guild, userIds) {
    return Promise.all(
      userIds.map(userId => this.fetchMember(guild, userId))
    );
  }

  // ============================================================================
  // CHANNEL FETCHING
  // ============================================================================

  /**
   * Fetch a channel (batched)
   */
  async fetchChannel(client, channelId) {
    return new Promise((resolve, reject) => {
      this.channelQueue.push({ client, channelId, resolve, reject });
      this.scheduleBatch('channels');
    });
  }

  /**
   * Fetch multiple channels (batched)
   */
  async fetchChannels(client, channelIds) {
    return Promise.all(
      channelIds.map(channelId => this.fetchChannel(client, channelId))
    );
  }

  // ============================================================================
  // ROLE FETCHING
  // ============================================================================

  /**
   * Fetch a role (batched)
   */
  async fetchRole(guild, roleId) {
    return new Promise((resolve, reject) => {
      this.roleQueue.push({ guild, roleId, resolve, reject });
      this.scheduleBatch('roles');
    });
  }

  /**
   * Fetch multiple roles (batched)
   */
  async fetchRoles(guild, roleIds) {
    return Promise.all(
      roleIds.map(roleId => this.fetchRole(guild, roleId))
    );
  }

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  /**
   * Schedule a batch to be processed
   */
  scheduleBatch(type) {
    if (this.processing[type]) return;
    
    this.processing[type] = true;
    
    setTimeout(() => {
      this.processBatch(type);
    }, this.config.batchDelay);
  }

  /**
   * Process a batch
   */
  async processBatch(type) {
    const queue = this.getQueue(type);
    
    if (queue.length === 0) {
      this.processing[type] = false;
      return;
    }
    
    const batch = queue.splice(0, this.config.batchSize);
    
    await this.executeBatch(type, batch);
    
    this.stats[type].batched += batch.length;
    
    // If more items in queue, schedule next batch
    if (queue.length > 0) {
      setTimeout(() => {
        this.processBatch(type);
      }, this.config.requestDelay);
    } else {
      this.processing[type] = false;
    }
  }

  /**
   * Execute a batch of requests
   */
  async executeBatch(type, batch) {
    const results = await Promise.allSettled(
      batch.map(item => this.executeRequest(type, item))
    );
    
    results.forEach((result, index) => {
      const item = batch[index];
      
      if (result.status === 'fulfilled') {
        item.resolve(result.value);
      } else {
        this.stats[type].errors++;
        item.reject(result.reason);
      }
    });
  }

  /**
   * Execute a single request
   */
  async executeRequest(type, item) {
    switch (type) {
      case 'users':
        return await item.client.users.fetch(item.userId);
      
      case 'members':
        return await item.guild.members.fetch(item.userId);
      
      case 'channels':
        return await item.client.channels.fetch(item.channelId);
      
      case 'roles':
        return await item.guild.roles.fetch(item.roleId);
      
      default:
        throw new Error(`Unknown batch type: ${type}`);
    }
  }

  /**
   * Get queue for a type
   */
  getQueue(type) {
    switch (type) {
      case 'users': return this.userQueue;
      case 'members': return this.memberQueue;
      case 'channels': return this.channelQueue;
      case 'roles': return this.roleQueue;
      default: return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get statistics
   */
  getStats() {
    const total = Object.values(this.stats).reduce((sum, stat) => {
      return {
        batched: sum.batched + stat.batched,
        errors: sum.errors + stat.errors
      };
    }, { batched: 0, errors: 0 });
    
    return {
      ...this.stats,
      total,
      queued: {
        users: this.userQueue.length,
        members: this.memberQueue.length,
        channels: this.channelQueue.length,
        roles: this.roleQueue.length
      }
    };
  }

  /**
   * Clear all queues
   */
  clearQueues() {
    this.userQueue = [];
    this.memberQueue = [];
    this.channelQueue = [];
    this.roleQueue = [];
    
    console.log('[DISCORD BATCHER] All queues cleared');
  }

  /**
   * Configure batch settings
   */
  configure(options) {
    this.config = { ...this.config, ...options };
    console.log('[DISCORD BATCHER] Configuration updated:', this.config);
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      users: { batched: 0, errors: 0 },
      members: { batched: 0, errors: 0 },
      channels: { batched: 0, errors: 0 },
      roles: { batched: 0, errors: 0 }
    };
    console.log('[DISCORD BATCHER] Statistics reset');
  }
}

// Export singleton instance
export default new DiscordBatcher();

/**
 * Usage Example:
 * 
 * // Instead of:
 * const user = await client.users.fetch(userId);
 * 
 * // Use:
 * import discordBatcher from './utils/discordBatcher.js';
 * const user = await discordBatcher.fetchUser(client, userId);
 * 
 * // Batch fetch multiple users:
 * const users = await discordBatcher.fetchUsers(client, [id1, id2, id3]);
 */
