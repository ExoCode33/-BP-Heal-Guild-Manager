class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = null;
    this.debugMode = process.env.DEBUG_MODE === 'true';
  }

  setClient(client, logChannelId) {
    this.client = client;
    this.logChannelId = logChannelId;
  }

  async sendToChannel(message) {
    if (!this.client || !this.logChannelId) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;

      await channel.send(message);
    } catch (error) {
      console.error(`Failed to log to channel: ${error.message}`);
    }
  }

  getUTCTimestamp() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = now.getUTCDate();
    const year = now.getUTCFullYear();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${month} ${day}, ${year} at ${hours}:${minutes}:${seconds} UTC`;
  }

  async logStartup(clientTag, port, commandCount) {
    const timestamp = this.getUTCTimestamp();
    const nodeVersion = process.version;
    const platform = process.platform;
    
    const messages = [
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Bot initialized\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Logged in as: \u001b[0;36m${clientTag}\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Server: \u001b[0;36mport ${port}\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Commands: \u001b[0;36m${commandCount} commands\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Handlers: \u001b[0;36mregistration, editing, interactions\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Node: \u001b[0;36m${nodeVersion}\u001b[0m | Platform: \u001b[0;36m${platform}\u001b[0m\n\`\`\``
    ];
    
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Bot initialized');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Logged in as: \x1b[36m' + clientTag + '\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Server: \x1b[36mport ' + port + '\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Commands: \x1b[36m' + commandCount + ' commands\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Handlers: \x1b[36mregistration, editing, interactions\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Node: \x1b[36m' + nodeVersion + '\x1b[0m | Platform: \x1b[36m' + platform + '\x1b[0m');
    
    for (const message of messages) {
      await this.sendToChannel(message);
    }
  }

  async logCommand(commandName, userTag, userId, guildName = null, channelName = null) {
    const timestamp = this.getUTCTimestamp();
    const message = `\`\`\`ansi
\u001b[0;35m[COMMAND]\u001b[0m ${timestamp} - /${commandName} by \u001b[0;36m${userTag}\u001b[0m
\`\`\``;
    
    console.log('\x1b[35m[COMMAND]\x1b[0m ' + timestamp + ' - /' + commandName + ' by \x1b[36m' + userTag + '\x1b[0m');
    if (guildName) console.log('  Guild: ' + guildName + ' | Channel: ' + channelName);
    
    await this.sendToChannel(message);
  }

  log(message) {
    const timestamp = this.getUTCTimestamp();
    const logMessage = `\`\`\`ansi
\u001b[0;34m[LOG]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(logMessage);
  }

  error(message, error = null) {
    const timestamp = this.getUTCTimestamp();
    
    // Console output with full details
    let consoleOutput = `[ERROR] ${new Date().toISOString()} - ${message}`;
    if (error) {
      consoleOutput += `\n  Error: ${error.message}`;
      consoleOutput += `\n  Type: ${error.name}`;
      if (error.code) consoleOutput += `\n  Code: ${error.code}`;
      if (error.stack) {
        consoleOutput += `\n  Stack:\n    ${error.stack.split('\n').slice(0, 5).join('\n    ')}`;
      }
    }
    console.error(consoleOutput);
    
    // Discord message (simple)
    const errorMessage = `\`\`\`ansi
\u001b[0;31m[ERROR]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    this.sendToChannel(errorMessage);
  }

  warn(message) {
    const timestamp = this.getUTCTimestamp();
    const warnMessage = `\`\`\`ansi
\u001b[0;33m[WARN]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(warnMessage);
  }

  success(message) {
    const timestamp = this.getUTCTimestamp();
    const successMessage = `\`\`\`ansi
\u001b[0;32m[SUCCESS]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(successMessage);
  }

  debug(message, data = null) {
    if (!this.debugMode) return;
    
    let output = `[DEBUG] ${new Date().toISOString()} - ${message}`;
    if (data) output += '\n  Data: ' + JSON.stringify(data, null, 2).split('\n').join('\n  ');
    console.log(output);
  }

  async logAction(username, action, details = '') {
    const timestamp = this.getUTCTimestamp();
    const actionMessage = `\`\`\`ansi
\u001b[0;34m[LOG]\u001b[0m ${timestamp} - User \u001b[0;36m${username}\u001b[0m ${action}${details ? ` - ${details}` : ''}
\`\`\``;
    console.log(`[LOG] ${new Date().toISOString()} - User ${username} ${action}${details ? ` - ${details}` : ''}`);
    await this.sendToChannel(actionMessage);
  }

  async logInteractionError(interactionType, userId, error, interaction = null) {
    const timestamp = this.getUTCTimestamp();
    
    // Detailed console output
    let consoleOutput = `[INTERACTION ERROR] ${new Date().toISOString()}`;
    consoleOutput += `\n  Type: ${interactionType}`;
    consoleOutput += `\n  User ID: ${userId}`;
    consoleOutput += `\n  Error: ${error.message}`;
    consoleOutput += `\n  Error Type: ${error.name}`;
    if (error.code) consoleOutput += `\n  Error Code: ${error.code}`;
    
    if (interaction) {
      consoleOutput += `\n  Custom ID: ${interaction.customId || 'N/A'}`;
      consoleOutput += `\n  Guild: ${interaction.guild?.name || 'DM'}`;
      consoleOutput += `\n  Channel: ${interaction.channel?.name || 'DM'}`;
      consoleOutput += `\n  Replied: ${interaction.replied}`;
      consoleOutput += `\n  Deferred: ${interaction.deferred}`;
    }
    
    if (error.stack) {
      consoleOutput += `\n  Stack:\n    ${error.stack.split('\n').slice(0, 5).join('\n    ')}`;
    }
    
    console.error(consoleOutput);
    
    // Simple Discord message
    const errorMessage = `\`\`\`ansi
\u001b[0;31m[INTERACTION ERROR]\u001b[0m ${timestamp}
Type: ${interactionType}
User: ${userId}
Error: ${error.message}
\`\`\``;
    
    await this.sendToChannel(errorMessage);
  }

  async logRegistration(userId, username, characterType, characterData) {
    const timestamp = this.getUTCTimestamp();
    
    // Detailed console output
    console.log(`[REGISTRATION] ${new Date().toISOString()}`);
    console.log(`  User: ${username} (${userId})`);
    console.log(`  Type: ${characterType}`);
    console.log(`  IGN: ${characterData.ign}`);
    console.log(`  Class: ${characterData.class} - ${characterData.subclass}`);
    console.log(`  Score: ${characterData.abilityScore}`);
    console.log(`  Guild: ${characterData.guild}`);
    
    // Simple Discord message
    const message = `\`\`\`ansi
\u001b[0;32m[REGISTRATION]\u001b[0m ${timestamp}
User: \u001b[0;36m${username}\u001b[0m | Type: ${characterType}
IGN: ${characterData.ign} | Class: ${characterData.class}
\`\`\``;
    
    await this.sendToChannel(message);
  }

  async logEdit(userId, username, characterType, field, oldValue, newValue) {
    const timestamp = this.getUTCTimestamp();
    
    // Detailed console output
    console.log(`[EDIT] ${new Date().toISOString()}`);
    console.log(`  User: ${username} (${userId})`);
    console.log(`  Character Type: ${characterType}`);
    console.log(`  Field: ${field}`);
    console.log(`  Changed: ${oldValue} → ${newValue}`);
    
    // Simple Discord message
    const message = `\`\`\`ansi
\u001b[0;33m[EDIT]\u001b[0m ${timestamp}
User: \u001b[0;36m${username}\u001b[0m
Changed ${field}: ${oldValue} → ${newValue}
\`\`\``;
    
    await this.sendToChannel(message);
  }

  async logDatabase(operation, table, duration, success = true, details = '') {
    console.log(`[DATABASE] ${new Date().toISOString()} - ${operation.toUpperCase()} on ${table} (${duration}ms) ${success ? '✓' : '✗'}${details ? ` - ${details}` : ''}`);
  }

  async logSync(type, count, duration, success = true, error = null) {
    const timestamp = this.getUTCTimestamp();
    
    console.log(`[SYNC] ${new Date().toISOString()} - ${type} sync: ${count} items in ${duration}ms ${success ? '✓' : '✗'}${error ? ` - Error: ${error.message}` : ''}`);
    
    const message = `\`\`\`ansi
\u001b[0;32m[SYNC]\u001b[0m ${timestamp} - ${type}: ${count} items (${duration}ms)
\`\`\``;
    
    await this.sendToChannel(message);
  }
}

export default new Logger();
