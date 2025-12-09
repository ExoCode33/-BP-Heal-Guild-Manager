// src/utils/logger.js
import dotenv from 'dotenv';
dotenv.config();

class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = process.env.LOG_CHANNEL_ID;
    this.verboseMode = process.env.LOG_VERBOSE === 'true';
    this.logToDiscord = process.env.LOG_TO_DISCORD !== 'false';
    
    this.startup = {
      handlers: null,
      server: null,
      bot: null,
      commands: null
    };
  }

  init(client) {
    this.client = client;
    if (this.logChannelId && this.logToDiscord) {
      console.log('[INFO] Discord logging enabled');
      this.sendStartupSummary();
    }
  }

  async sendStartupSummary() {
    if (!this.startup.handlers || !this.startup.server || !this.startup.bot || !this.startup.commands) {
      return;
    }

    const message = 
      '```ansi\n' +
      '\u001b[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n' +
      '\u001b[1;32m           BOT STARTED\u001b[0m\n' +
      '\u001b[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n' +
      '\n' +
      `\u001b[1;36mBot:\u001b[0m ${this.startup.bot}\n` +
      `\u001b[1;36mServer:\u001b[0m ${this.startup.server}\n` +
      `\u001b[1;36mCommands:\u001b[0m ${this.startup.commands}\n` +
      `\u001b[1;36mHandlers:\u001b[0m ${this.startup.handlers}\n` +
      '```';

    await this.toDiscord(message);
  }

  async toDiscord(message) {
    if (!this.logChannelId || !this.client || !this.logToDiscord) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;
      await channel.send(message);
    } catch (error) {
      // Silently fail
    }
  }

  // Console logging methods
  info(message, sendToDiscord = false) {
    console.log(`[INFO] ${message}`);
    if (sendToDiscord) {
      const colored = '```ansi\n' +
        `\u001b[1;34m[INFO]\u001b[0m ${message}\n` +
        '```';
      this.toDiscord(colored);
    }
  }

  success(message, sendToDiscord = true) {
    console.log(`[SUCCESS] ${message}`);
    if (sendToDiscord) {
      const colored = '```ansi\n' +
        `\u001b[1;32m[SUCCESS]\u001b[0m ${message}\n` +
        '```';
      this.toDiscord(colored);
    }
  }

  error(message, sendToDiscord = true) {
    console.error(`[ERROR] ${message}`);
    if (sendToDiscord) {
      const colored = '```ansi\n' +
        `\u001b[1;31m[ERROR]\u001b[0m ${message}\n` +
        '```';
      this.toDiscord(colored);
    }
  }

  warning(message, sendToDiscord = true) {
    console.log(`[WARNING] ${message}`);
    if (sendToDiscord) {
      const colored = '```ansi\n' +
        `\u001b[1;33m[WARNING]\u001b[0m ${message}\n` +
        '```';
      this.toDiscord(colored);
    }
  }

  command(message, sendToDiscord = true) {
    console.log(`[COMMAND] ${message}`);
    if (sendToDiscord) {
      const colored = '```ansi\n' +
        `\u001b[1;35m[COMMAND]\u001b[0m ${message}\n` +
        '```';
      this.toDiscord(colored);
    }
  }

  sync(message, sendToDiscord = true) {
    console.log(`[SYNC] ${message}`);
    if (sendToDiscord) {
      const colored = '```ansi\n' +
        `\u001b[1;36m[SYNC]\u001b[0m ${message}\n` +
        '```';
      this.toDiscord(colored);
    }
  }

  verbose(message) {
    if (this.verboseMode) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // Startup logs
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

  // Command execution with colored text
  commandExecuted(commandName, username) {
    const msg = `/${commandName} by ${username}`;
    this.verbose(msg);
    
    const colored = '```ansi\n' +
      `\u001b[1;35m[COMMAND]\u001b[0m /${commandName} by \u001b[1;36m${username}\u001b[0m\n` +
      '```';
    
    this.toDiscord(colored);
  }

  commandError(commandName, error) {
    const msg = `Command /${commandName} failed: ${error.message}`;
    this.error(msg, false);
    
    const colored = '```ansi\n' +
      `\u001b[1;31m[ERROR]\u001b[0m Command /${commandName} failed\n` +
      `\u001b[0;31m${error.message}\u001b[0m\n` +
      '```';
    
    this.toDiscord(colored);
  }

  interaction(type, customId) {
    const action = customId.split('_').slice(0, -1).join('_') || customId;
    this.verbose(`${type} interaction: ${action}`);
  }

  // Sync logs with colored text
  syncStarted() {
    console.log('[SYNC] Sync started');
    
    const colored = '```ansi\n' +
      `\u001b[1;36m[SYNC]\u001b[0m Syncing to Google Sheets...\n` +
      '```';
    
    this.toDiscord(colored);
  }

  syncComplete() {
    console.log('[SUCCESS] Sync completed');
    
    const colored = '```ansi\n' +
      `\u001b[1;32m[SUCCESS]\u001b[0m Sync complete - All data synced to Google Sheets\n` +
      '```';
    
    this.toDiscord(colored);
  }

  syncFailed(error) {
    console.error(`[ERROR] Sync failed: ${error.message}`);
    
    const colored = '```ansi\n' +
      `\u001b[1;31m[ERROR]\u001b[0m Sync failed\n` +
      `\u001b[0;31m${error.message}\u001b[0m\n` +
      '```';
    
    this.toDiscord(colored);
  }

  dbConnected() {
    this.verbose('Database connected');
  }

  shutdown() {
    console.log('[SHUTDOWN] Bot shutting down');
    
    const colored = '```ansi\n' +
      `\u001b[1;33m[SHUTDOWN]\u001b[0m Bot shutting down...\n` +
      '```';
    
    this.toDiscord(colored);
  }
}

const logger = new Logger();
export default logger;
