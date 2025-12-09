// src/utils/logger.js
import dotenv from 'dotenv';
dotenv.config();

class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = process.env.LOG_CHANNEL_ID;
    this.verboseMode = process.env.LOG_VERBOSE === 'true';
    this.logToDiscord = process.env.LOG_TO_DISCORD !== 'false';
    
    // Track startup to send one summary
    this.startup = {
      handlers: null,
      server: null,
      bot: null,
      commands: null
    };
  }

  // Initialize with Discord client
  init(client) {
    this.client = client;
    if (this.logChannelId && this.logToDiscord) {
      console.log('[INFO] Discord logging enabled');
      this.sendStartupSummary();
    }
  }

  // Send consolidated startup summary to Discord
  async sendStartupSummary() {
    if (!this.startup.handlers || !this.startup.server || !this.startup.bot || !this.startup.commands) {
      return;
    }

    const summary = [
      '**BOT STARTED**',
      `Bot: ${this.startup.bot}`,
      `Handlers: ${this.startup.handlers}`,
      `Commands: ${this.startup.commands}`,
      `Server: ${this.startup.server}`
    ].join('\n');

    await this.toDiscord(summary, 'SUCCESS');
  }

  // Send to Discord with professional format
  async toDiscord(message, level = 'INFO') {
    if (!this.logChannelId || !this.client || !this.logToDiscord) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;
      
      const prefix = {
        'INFO': '[INFO]',
        'SUCCESS': '[SUCCESS]',
        'ERROR': '[ERROR]',
        'WARNING': '[WARNING]',
        'COMMAND': '[COMMAND]',
        'SYNC': '[SYNC]'
      };
      
      const logPrefix = prefix[level] || '[LOG]';
      const timestamp = new Date().toISOString();
      
      // Professional format: [LEVEL] YYYY-MM-DD HH:MM:SS - message
      if (level === 'SUCCESS' || level === 'ERROR') {
        // Multi-line messages
        await channel.send(`**${logPrefix}** ${timestamp}\n${message}`);
      } else {
        // Single line messages
        await channel.send(`**${logPrefix}** ${timestamp} - ${message}`);
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Core logging methods
  info(message, sendToDiscord = false) {
    console.log(`[INFO] ${message}`);
    if (sendToDiscord) this.toDiscord(message, 'INFO');
  }

  success(message, sendToDiscord = true) {
    console.log(`[SUCCESS] ${message}`);
    if (sendToDiscord) this.toDiscord(message, 'SUCCESS');
  }

  error(message, sendToDiscord = true) {
    console.error(`[ERROR] ${message}`);
    if (sendToDiscord) this.toDiscord(message, 'ERROR');
  }

  warning(message, sendToDiscord = true) {
    console.log(`[WARNING] ${message}`);
    if (sendToDiscord) this.toDiscord(message, 'WARNING');
  }

  command(message, sendToDiscord = true) {
    console.log(`[COMMAND] ${message}`);
    if (sendToDiscord) this.toDiscord(message, 'COMMAND');
  }

  sync(message, sendToDiscord = true) {
    console.log(`[SYNC] ${message}`);
    if (sendToDiscord) this.toDiscord(message, 'SYNC');
  }

  // Verbose logging (only console, never Discord)
  verbose(message) {
    if (this.verboseMode) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // Startup logs (compact)
  handlers(loaded, missing) {
    const loadedStr = loaded.length > 0 ? loaded.join(', ') : 'none';
    const msg = `Handlers loaded: ${loadedStr}`;
    this.info(msg);
    this.startup.handlers = loadedStr;
    if (missing.length > 0) {
      this.warning(`Missing handlers: ${missing.join(', ')}`, false);
    }
    this.sendStartupSummary();
  }

  server(port) {
    const msg = `Server running on port ${port}`;
    this.info(msg);
    this.startup.server = `port ${port}`;
    this.sendStartupSummary();
  }

  botReady(username) {
    const msg = `Bot ready: ${username}`;
    this.info(msg);
    this.startup.bot = username;
    this.sendStartupSummary();
  }

  commands(count) {
    const msg = `Commands registered: ${count}`;
    this.info(msg);
    this.startup.commands = `${count} commands`;
    this.sendStartupSummary();
  }

  // Command execution
  commandExecuted(commandName, username) {
    const msg = `Command /${commandName} executed by ${username}`;
    this.command(msg);
    this.verbose(`/${commandName} by ${username}`);
  }

  commandError(commandName, error) {
    const msg = `Command /${commandName} failed: ${error.message}`;
    this.error(msg);
  }

  // Button/Select/Modal interactions
  interaction(type, customId) {
    const action = customId.split('_').slice(0, -1).join('_') || customId;
    this.verbose(`${type} interaction: ${action}`);
    
    // Log important interactions to Discord
    if (type === 'Button' && (customId.includes('confirm') || customId.includes('remove'))) {
      this.command(`${type} interaction: ${action}`);
    }
  }

  // Sync logs
  syncStarted() {
    this.sync('Sync to Google Sheets started');
  }

  syncComplete() {
    this.success('Sync to Google Sheets completed');
  }

  syncFailed(error) {
    this.error(`Sync to Google Sheets failed: ${error.message}`);
  }

  // Database connection
  dbConnected() {
    this.verbose('Database connected');
  }

  // Shutdown
  shutdown() {
    const msg = 'Bot shutting down';
    this.warning(msg);
    console.log('[SHUTDOWN] Bot shutting down');
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
