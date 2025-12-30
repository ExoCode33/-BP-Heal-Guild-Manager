import { EmbedBuilder } from 'discord.js';
import pool from '../database/index.js';
import { COLORS } from '../config/game.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  ANSI COLOR CODES
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  
  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LOG CATEGORIES & FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_CATEGORIES = {
  SYSTEM:      { color: c.brightMagenta, icon: '★', label: 'SYSTEM    ', enabled: true },
  DATABASE:    { color: c.blue,          icon: '◈', label: 'DATABASE  ', enabled: true },
  COMMAND:     { color: c.brightGreen,   icon: '⚡', label: 'COMMAND   ', enabled: true },
  BUTTON:      { color: c.cyan,          icon: '●', label: 'BUTTON    ', enabled: true },
  SELECT:      { color: c.cyan,          icon: '◆', label: 'SELECT    ', enabled: true },
  MODAL:       { color: c.cyan,          icon: '▣', label: 'MODAL     ', enabled: true },
  REGISTER:    { color: c.brightMagenta, icon: '✦', label: 'REGISTER  ', enabled: true },
  EDIT:        { color: c.yellow,        icon: '✎', label: 'EDIT      ', enabled: true },
  DELETE:      { color: c.red,           icon: '✖', label: 'DELETE    ', enabled: true },
  APPLICATION: { color: c.brightYellow,  icon: '📋', label: 'APPLICATION', enabled: true },
  VOTE:        { color: c.green,         icon: '✓', label: 'VOTE      ', enabled: true },
  OVERRIDE:    { color: c.brightRed,     icon: '⚠', label: 'OVERRIDE  ', enabled: true },
  SHEETS:      { color: c.magenta,       icon: '▤', label: 'SHEETS    ', enabled: true },
  NICKNAME:    { color: c.blue,          icon: '◎', label: 'NICKNAME  ', enabled: true },
  ROLES:       { color: c.brightBlue,    icon: '⚙', label: 'ROLES     ', enabled: true },
  VERIFY:      { color: c.green,         icon: '✔', label: 'VERIFY    ', enabled: true },
  ERROR:       { color: c.brightRed,     icon: '✘', label: 'ERROR     ', enabled: true },
  WARN:        { color: c.yellow,        icon: '⚡', label: 'WARN      ', enabled: true },
  DEBUG:       { color: c.gray,          icon: '·', label: 'DEBUG     ', enabled: false },
  ROUTER:      { color: c.gray,          icon: '→', label: 'ROUTER    ', enabled: true },
  STATE:       { color: c.gray,          icon: '◌', label: 'STATE     ', enabled: false },
  SERVICE:     { color: c.brightCyan,    icon: '◇', label: 'SERVICE   ', enabled: true },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ProfessionalLogger {
  constructor() {
    this.client = null;
    this.startTime = Date.now();
    this.stats = {
      commands: 0,
      buttons: 0,
      selects: 0,
      modals: 0,
      registrations: 0,
      edits: 0,
      deletions: 0,
      applications: 0,
      votes: 0,
      overrides: 0,
      errors: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CATEGORY CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  enable(category) {
    const cat = category.toUpperCase();
    if (LOG_CATEGORIES[cat]) {
      LOG_CATEGORIES[cat].enabled = true;
      this.system(`Logging enabled for: ${c.bold}${cat}${c.reset}`);
    }
  }

  disable(category) {
    const cat = category.toUpperCase();
    if (LOG_CATEGORIES[cat]) {
      LOG_CATEGORIES[cat].enabled = false;
    }
  }

  enableAll() {
    Object.keys(LOG_CATEGORIES).forEach(cat => LOG_CATEGORIES[cat].enabled = true);
    this.system('All logging categories enabled');
  }

  disableAll() {
    Object.keys(LOG_CATEGORIES).forEach(cat => LOG_CATEGORIES[cat].enabled = false);
  }

  setCategories(categories) {
    Object.keys(LOG_CATEGORIES).forEach(cat => LOG_CATEGORIES[cat].enabled = false);
    categories.forEach(cat => {
      const upper = cat.toUpperCase();
      if (LOG_CATEGORIES[upper]) LOG_CATEGORIES[upper].enabled = true;
    });
  }

  listCategories() {
    console.log('');
    console.log(c.brightMagenta + '  ╔════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + c.bold + '                   LOG CATEGORIES                          ' + c.reset + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ╠════════════════════════════════════════════════════════════╣' + c.reset);
    
    Object.entries(LOG_CATEGORIES).forEach(([name, config]) => {
      const status = config.enabled 
        ? c.brightGreen + ' ON ' + c.reset 
        : c.red + ' OFF' + c.reset;
      const icon = config.color + config.icon + c.reset;
      const coloredName = config.color + name.padEnd(12) + c.reset;
      console.log(c.brightMagenta + '  ║' + c.reset + `  ${icon}  ${coloredName} ${status}                                  `.slice(0, 56) + c.brightMagenta + '║' + c.reset);
    });
    
    console.log(c.brightMagenta + '  ╚════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FORMATTING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  timestamp() {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  fullTimestamp() {
    return new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  uptime() {
    return this.formatDuration(Date.now() - this.startTime);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CORE LOGGING METHOD - CLEAN ASCII, NO SQUARE BARS
  // ═══════════════════════════════════════════════════════════════════════════

  log(category, message, extra = null) {
    const cat = LOG_CATEGORIES[category];
    if (!cat || !cat.enabled) return;

    const time = c.gray + this.timestamp() + c.reset;
    const icon = cat.color + cat.icon + c.reset;
    const catLabel = cat.color + cat.label + c.reset;
    
    let output = `  ${time}  ${icon}  ${catLabel}  ${message}`;
    
    if (extra) {
      if (typeof extra === 'string') {
        output += c.gray + `  ››  ${extra}` + c.reset;
      } else if (extra.user) {
        output += c.gray + `  ››  ` + c.cyan + extra.user + c.reset;
      }
    }
    
    console.log(output);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STARTUP / SHUTDOWN BANNERS
  // ═══════════════════════════════════════════════════════════════════════════

  async init(client) {
    this.client = client;
    global.client = client;
  }

  printBanner(botTag, commandCount) {
    const version = 'v3.2.0';
    console.log('');
    console.log(c.brightMagenta + '  ╔════════════════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '                                                                        ' + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '          ' + c.bold + c.brightCyan + '★  ' + c.brightWhite + 'i D o l l s    B o t' + c.brightCyan + '  ★' + c.reset + '          ' + c.dim + version + c.reset + '               ' + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '                                                                        ' + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '          ' + c.gray + '─────────────────────────────────────────────' + c.reset + '               ' + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '          ' + c.dim + this.fullTimestamp() + c.reset + '                                         ' + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ╚════════════════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  startup(botTag, commandCount) {
    this.printBanner(botTag, commandCount);
    this.log('SYSTEM', `Logged in as ${c.bold}${c.brightCyan}${botTag}${c.reset}`);
    this.log('SYSTEM', `Loaded ${c.bold}${c.brightGreen}${commandCount}${c.reset} commands`);
  }

  ready(serviceCount = 0) {
    console.log('');
    console.log(c.brightGreen + '  ╔════════════════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(c.brightGreen + '  ║' + c.reset + '          ' + c.bold + c.brightGreen + '★  BOT READY  ★' + c.reset + '     ' + c.dim + `${serviceCount} services active` + c.reset + '                        ' + c.brightGreen + '║' + c.reset);
    console.log(c.brightGreen + '  ╚════════════════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  shutdown(reason) {
    console.log('');
    console.log(c.brightRed + '  ╔════════════════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '          ' + c.bold + c.red + 'SHUTTING DOWN' + c.reset + '     ' + c.dim + `Reason: ${reason}` + c.reset + '                            ' + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '          ' + c.dim + `Uptime: ${this.uptime()}` + c.reset + '                                                 ' + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ╚════════════════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SIMPLE CATEGORY LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  system(message) {
    this.log('SYSTEM', message);
  }

  database(message, details = null) {
    this.log('DATABASE', message, details);
  }

  sheets(message, details = null) {
    this.log('SHEETS', message, details);
  }

  sheetsSync(count, duration) {
    this.log('SHEETS', `${c.green}Synced${c.reset} ${c.bold}${count}${c.reset} rows in ${c.cyan}${duration}ms${c.reset}`);
  }

  sheetsQueued(waitTime) {
    this.log('SHEETS', `${c.yellow}Queued${c.reset} ${c.dim}(rate limited, ${waitTime}s remaining)${c.reset}`);
  }

  verification(message, details = null) {
    this.log('VERIFY', message, details);
  }

  roles(message, details = null) {
    this.log('ROLES', message, details);
  }

  roleValidation(checked, fixed) {
    this.log('ROLES', `Validated ${c.bold}${checked}${c.reset} users, fixed ${c.yellow}${fixed}${c.reset}`);
  }

  nickname(message, details = null) {
    this.log('NICKNAME', message, details);
  }

  nicknameSync(updated, failed) {
    if (failed > 0) {
      this.log('NICKNAME', `Updated: ${c.green}${updated}${c.reset}  Failed: ${c.red}${failed}${c.reset}`);
    } else {
      this.log('NICKNAME', `Updated: ${c.green}${updated}${c.reset} ${c.dim}(all successful)${c.reset}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INTERACTION LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  command(name, username, subcommand = null) {
    this.stats.commands++;
    const cmd = subcommand 
      ? `${c.brightGreen}/${name}${c.reset} ${c.cyan}${subcommand}${c.reset}` 
      : `${c.brightGreen}/${name}${c.reset}`;
    this.log('COMMAND', cmd, { user: username });
  }

  button(customId, username) {
    this.stats.buttons++;
    this.log('BUTTON', c.dim + customId + c.reset, { user: username });
  }

  select(customId, value, username) {
    this.stats.selects++;
    const display = value 
      ? `${c.dim}${customId}${c.reset}  →  ${c.cyan}${value}${c.reset}` 
      : c.dim + customId + c.reset;
    this.log('SELECT', display, { user: username });
  }

  modal(customId, username) {
    this.stats.modals++;
    this.log('MODAL', c.dim + customId + c.reset, { user: username });
  }

  router(type, customId) {
    this.log('ROUTER', `${c.dim}${type}:${c.reset} ${customId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHARACTER LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  register(username, type, ign, classInfo) {
    this.stats.registrations++;
    const typeColor = type === 'main' ? c.brightMagenta : c.cyan;
    console.log('');
    console.log(c.brightMagenta + '  ┌─────────────────────────────────────────────────────────────────────┐' + c.reset);
    console.log(c.brightMagenta + '  │' + c.reset + '  ' + c.brightMagenta + '✦' + c.reset + '  ' + c.bold + 'NEW REGISTRATION' + c.reset + '                                                 ' + c.brightMagenta + '│' + c.reset);
    console.log(c.brightMagenta + '  ├─────────────────────────────────────────────────────────────────────┤' + c.reset);
    console.log(c.brightMagenta + '  │' + c.reset + '      User:   ' + c.cyan + username.padEnd(50) + c.reset + c.brightMagenta + '│' + c.reset);
    console.log(c.brightMagenta + '  │' + c.reset + '      Type:   ' + typeColor + type.toUpperCase().padEnd(50) + c.reset + c.brightMagenta + '│' + c.reset);
    console.log(c.brightMagenta + '  │' + c.reset + '      IGN:    ' + c.bold + ign.padEnd(50) + c.reset + c.brightMagenta + '│' + c.reset);
    console.log(c.brightMagenta + '  │' + c.reset + '      Class:  ' + classInfo.padEnd(50) + c.brightMagenta + '│' + c.reset);
    console.log(c.brightMagenta + '  └─────────────────────────────────────────────────────────────────────┘' + c.reset);
    console.log('');
  }

  edit(username, field, oldVal, newVal) {
    this.stats.edits++;
    this.log('EDIT', `${c.yellow}${field}${c.reset}: ${c.dim}${oldVal}${c.reset}  →  ${c.bold}${newVal}${c.reset}`, { user: username });
  }

  delete(username, type, label) {
    this.stats.deletions++;
    this.log('DELETE', `${c.red}${type}${c.reset}  ${label}`, { user: username });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  APPLICATION LOGS - DETAILED WITH WHO VOTED
  // ═══════════════════════════════════════════════════════════════════════════

  applicationCreated(data) {
    this.stats.applications++;
    console.log('');
    console.log(c.brightYellow + '  ┌─────────────────────────────────────────────────────────────────────┐' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '  ' + c.brightYellow + '📋' + c.reset + '  ' + c.bold + c.green + 'NEW APPLICATION' + c.reset + '                                                  ' + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  ├─────────────────────────────────────────────────────────────────────┤' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '      Applicant:  ' + c.cyan + (data.username || 'Unknown').padEnd(46) + c.reset + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '      IGN:        ' + c.bold + (data.ign || 'Unknown').padEnd(46) + c.reset + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '      Guild:      ' + c.brightMagenta + (data.guildName || 'Unknown').padEnd(46) + c.reset + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '      Class:      ' + (data.class || 'Unknown').padEnd(46) + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '      Subclass:   ' + (data.subclass || 'None').padEnd(46) + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  │' + c.reset + '      Score:      ' + (data.abilityScore || 'N/A').padEnd(46) + c.brightYellow + '│' + c.reset);
    console.log(c.brightYellow + '  └─────────────────────────────────────────────────────────────────────┘' + c.reset);
    console.log('');
  }

  applicationVote(data) {
    this.stats.votes++;
    const voteIcon = data.vote === 'accept' 
      ? c.brightGreen + '✓ ACCEPT' + c.reset 
      : c.brightRed + '✗ DENY' + c.reset;
    
    console.log('');
    console.log(c.green + '  ┌─────────────────────────────────────────────────────────────────────┐' + c.reset);
    console.log(c.green + '  │' + c.reset + '  ' + c.green + '✓' + c.reset + '  ' + c.bold + 'VOTE CAST' + c.reset + '                                                        ' + c.green + '│' + c.reset);
    console.log(c.green + '  ├─────────────────────────────────────────────────────────────────────┤' + c.reset);
    console.log(c.green + '  │' + c.reset + '      Voter:      ' + c.brightCyan + c.bold + (data.voterName || 'Unknown').padEnd(46) + c.reset + c.green + '│' + c.reset);
    console.log(c.green + '  │' + c.reset + '      Vote:       ' + voteIcon + '                                              ' + c.green + '│' + c.reset);
    console.log(c.green + '  │' + c.reset + '      On:         ' + c.cyan + (data.applicantName || 'Unknown') + c.reset + '\'s application                            ' + c.green + '│' + c.reset);
    console.log(c.green + '  │' + c.reset + '      IGN:        ' + (data.ign || 'Unknown').padEnd(46) + c.green + '│' + c.reset);
    console.log(c.green + '  ├─────────────────────────────────────────────────────────────────────┤' + c.reset);
    console.log(c.green + '  │' + c.reset + '      ' + c.bold + 'Current Tally:' + c.reset + '  ' + c.brightGreen + (data.acceptCount || 0) + c.reset + ' accepts  /  ' + c.brightRed + (data.denyCount || 0) + c.reset + ' denies                       ' + c.green + '│' + c.reset);
    console.log(c.green + '  └─────────────────────────────────────────────────────────────────────┘' + c.reset);
    console.log('');
  }

  applicationDecision(data) {
    const isApproved = data.status === 'approved';
    const borderColor = isApproved ? c.brightGreen : c.brightRed;
    const statusIcon = isApproved ? '★ APPROVED' : '✘ DENIED';
    const statusColor = isApproved ? c.brightGreen : c.brightRed;
    
    console.log('');
    console.log(borderColor + '  ╔═════════════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(borderColor + '  ║' + c.reset + '  ' + statusColor + '📋' + c.reset + '  ' + c.bold + statusColor + 'APPLICATION ' + statusIcon + c.reset + '                                       ' + borderColor + '║' + c.reset);
    console.log(borderColor + '  ╠═════════════════════════════════════════════════════════════════════╣' + c.reset);
    console.log(borderColor + '  ║' + c.reset + '      Applicant:  ' + c.cyan + (data.username || 'Unknown').padEnd(46) + c.reset + borderColor + '║' + c.reset);
    console.log(borderColor + '  ║' + c.reset + '      IGN:        ' + c.bold + (data.ign || 'Unknown').padEnd(46) + c.reset + borderColor + '║' + c.reset);
    console.log(borderColor + '  ║' + c.reset + '      Guild:      ' + c.brightMagenta + (data.guildName || 'Unknown').padEnd(46) + c.reset + borderColor + '║' + c.reset);
    console.log(borderColor + '  ╠═════════════════════════════════════════════════════════════════════╣' + c.reset);
    console.log(borderColor + '  ║' + c.reset + '      ' + c.bold + 'Final Tally:' + c.reset + '  ' + c.brightGreen + (data.acceptCount || 0) + c.reset + ' accepts  /  ' + c.brightRed + (data.denyCount || 0) + c.reset + ' denies                         ' + borderColor + '║' + c.reset);
    console.log(borderColor + '  ╠═════════════════════════════════════════════════════════════════════╣' + c.reset);
    
    // Show WHO voted accept
    if (data.acceptVoters && data.acceptVoters.length > 0) {
      console.log(borderColor + '  ║' + c.reset + '      ' + c.brightGreen + '✓ Accepted by:' + c.reset + '                                                   ' + borderColor + '║' + c.reset);
      data.acceptVoters.forEach(voter => {
        console.log(borderColor + '  ║' + c.reset + '          • ' + c.cyan + voter.padEnd(52) + c.reset + borderColor + '║' + c.reset);
      });
    }
    
    // Show WHO voted deny
    if (data.denyVoters && data.denyVoters.length > 0) {
      console.log(borderColor + '  ║' + c.reset + '      ' + c.brightRed + '✗ Denied by:' + c.reset + '                                                     ' + borderColor + '║' + c.reset);
      data.denyVoters.forEach(voter => {
        console.log(borderColor + '  ║' + c.reset + '          • ' + c.cyan + voter.padEnd(52) + c.reset + borderColor + '║' + c.reset);
      });
    }
    
    console.log(borderColor + '  ╚═════════════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  applicationOverride(data) {
    this.stats.overrides++;
    const decision = data.decision === 'approved' 
      ? c.brightGreen + 'APPROVED' + c.reset 
      : c.brightRed + 'DENIED' + c.reset;
    
    console.log('');
    console.log(c.brightRed + '  ╔═════════════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '  ' + c.brightRed + '⚠' + c.reset + '  ' + c.bold + c.yellow + 'ADMIN OVERRIDE' + c.reset + '                                                   ' + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ╠═════════════════════════════════════════════════════════════════════╣' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '      Admin:      ' + c.brightRed + c.bold + (data.adminName || 'Unknown').padEnd(46) + c.reset + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '      Action:     ' + decision + '                                              ' + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ╠═════════════════════════════════════════════════════════════════════╣' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '      Applicant:  ' + c.cyan + (data.applicantName || 'Unknown').padEnd(46) + c.reset + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '      IGN:        ' + (data.ign || 'Unknown').padEnd(46) + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '      Guild:      ' + c.brightMagenta + (data.guildName || 'Unknown').padEnd(46) + c.reset + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ╠═════════════════════════════════════════════════════════════════════╣' + c.reset);
    console.log(c.brightRed + '  ║' + c.reset + '      ' + c.dim + 'Votes were:' + c.reset + '  ' + c.brightGreen + (data.acceptCount || 0) + c.reset + ' accepts  /  ' + c.brightRed + (data.denyCount || 0) + c.reset + ' denies ' + c.dim + '(overridden)' + c.reset + '          ' + c.brightRed + '║' + c.reset);
    console.log(c.brightRed + '  ╚═════════════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ERROR / WARNING / INFO / DEBUG
  // ═══════════════════════════════════════════════════════════════════════════

  error(category, message, error = null) {
    this.stats.errors++;
    const errorMsg = error ? `${message}  ››  ${c.dim}${error.message || error}${c.reset}` : message;
    this.log('ERROR', `${c.red}[${category}]${c.reset} ${errorMsg}`);
    
    if (error?.stack && LOG_CATEGORIES.DEBUG.enabled) {
      console.log(c.dim + '  ' + error.stack.split('\n').slice(0, 3).join('\n  ') + c.reset);
    }
  }

  warn(category, message) {
    this.log('WARN', `${c.yellow}[${category}]${c.reset} ${message}`);
  }

  info(category, message) {
    this.log('SERVICE', `${c.cyan}[${category}]${c.reset} ${message}`);
  }

  debug(category, message) {
    this.log('DEBUG', `${c.gray}[${category}]${c.reset} ${message}`);
  }

  state(action, userId, data = null) {
    const dataStr = data ? `  ${c.dim}${JSON.stringify(data).slice(0, 50)}...${c.reset}` : '';
    this.log('STATE', `${action}  ${c.cyan}${userId}${c.reset}${dataStr}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  printStats() {
    console.log('');
    console.log(c.brightMagenta + '  ╔════════════════════════════════════════════════════════════╗' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + c.bold + '                   SESSION STATISTICS                       ' + c.reset + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ╠════════════════════════════════════════════════════════════╣' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Uptime:           ' + this.uptime().padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Commands:         ' + String(this.stats.commands).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Interactions:     ' + String(this.stats.buttons + this.stats.selects + this.stats.modals).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Registrations:    ' + String(this.stats.registrations).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Edits:            ' + String(this.stats.edits).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Applications:     ' + String(this.stats.applications).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Votes:            ' + String(this.stats.votes).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    ' + c.brightRed + 'Admin Overrides:' + c.reset + '  ' + String(this.stats.overrides).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ║' + c.reset + '    Errors:           ' + String(this.stats.errors).padEnd(33) + c.brightMagenta + '║' + c.reset);
    console.log(c.brightMagenta + '  ╚════════════════════════════════════════════════════════════╝' + c.reset);
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DATABASE SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettings(guildId) {
    try {
      const result = await pool.query(
        'SELECT * FROM guild_settings WHERE guild_id = $1',
        [guildId]
      );

      if (result.rows.length === 0) {
        return {
          generalChannelId: null,
          applicationChannelId: null,
          settings: {
            character_registration: true,
            character_updates: true,
            character_deletion: true,
            verification: true,
            guild_applications: true,
            application_votes: true,
            admin_overrides: true,
            settings_changes: true,
            role_changes: true
          }
        };
      }

      const row = result.rows[0];
      return {
        generalChannelId: row.general_log_channel_id,
        applicationChannelId: row.application_log_channel_id,
        settings: row.log_settings || {}
      };
    } catch (error) {
      this.error('Logger', 'Failed to get settings', error);
      return { generalChannelId: null, applicationChannelId: null, settings: {} };
    }
  }

  async sendToChannel(guildId, channelId, embed) {
    if (!channelId) return;
    
    try {
      const client = global.client || this.client;
      if (!client) return;
      
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      this.error('Logger', 'Failed to send to channel', error);
    }
  }

  async setGeneralLogChannel(guildId, channelId) {
    await pool.query(
      `INSERT INTO guild_settings (guild_id, general_log_channel_id) 
       VALUES ($1, $2) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET general_log_channel_id = $2`,
      [guildId, channelId]
    );
  }

  async setApplicationLogChannel(guildId, channelId) {
    await pool.query(
      `INSERT INTO guild_settings (guild_id, application_log_channel_id) 
       VALUES ($1, $2) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET application_log_channel_id = $2`,
      [guildId, channelId]
    );
  }

  async toggleLogSetting(guildId, eventType) {
    const config = await this.getSettings(guildId);
    const newValue = !config.settings[eventType];
    
    config.settings[eventType] = newValue;
    
    await pool.query(
      `INSERT INTO guild_settings (guild_id, log_settings) 
       VALUES ($1, $2) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET log_settings = $2`,
      [guildId, JSON.stringify(config.settings)]
    );
    
    return config;
  }

  async toggleGroupingSetting(guildId, eventType) {
    return {};
  }

  async setGroupingWindow(guildId, minutes) {
    // Placeholder
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DISCORD EMBED LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  async logCharacterRegistration(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.character_registration) return;

    const embed = new EmbedBuilder()
      .setTitle('📝 New Character Registered')
      .setColor(COLORS.SUCCESS)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🆔 UID', value: data.uid, inline: true },
        { name: '⚔️ Class', value: data.class, inline: true },
        { name: '🎯 Subclass', value: data.subclass || 'None', inline: true },
        { name: '🏆 Score', value: data.abilityScore || 'N/A', inline: true },
        { name: '🏰 Guild', value: data.guild || 'None', inline: true },
        { name: '📊 Type', value: data.characterType === 'main' ? 'Main' : 'Alt', inline: true }
      )
      .setTimestamp();

    await this.sendToChannel(guildId, config.generalChannelId, embed);
  }

  async logCharacterUpdate(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.character_updates) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Character Updated')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 Character', value: data.ign, inline: true },
        { name: '📝 Field', value: data.field, inline: true },
        { name: '📤 Old', value: `\`${data.oldValue}\``, inline: true },
        { name: '📥 New', value: `\`${data.newValue}\``, inline: true }
      )
      .setTimestamp();

    await this.sendToChannel(guildId, config.generalChannelId, embed);
  }

  async logCharacterDeletion(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.character_deletion) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Character Deleted')
      .setColor(COLORS.ERROR)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '⚔️ Class', value: data.class, inline: true },
        { name: '📊 Type', value: data.characterType === 'main' ? 'Main' : 'Alt', inline: true }
      )
      .setTimestamp();

    await this.sendToChannel(guildId, config.generalChannelId, embed);
  }

  async logApplicationCreated(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.guild_applications) return;

    const embed = new EmbedBuilder()
      .setTitle('📋 New Guild Application')
      .setColor(COLORS.PRIMARY)
      .setDescription(`**${data.guildName}** has a new applicant!`)
      .addFields(
        { name: '👤 Applicant', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '⚔️ Class', value: `${data.class} (${data.subclass})`, inline: true },
        { name: '🏆 Score', value: data.abilityScore || 'N/A', inline: true },
        { name: '🏰 Guild', value: data.guildName, inline: true }
      )
      .setFooter({ text: `Application ID: ${data.applicationId}` })
      .setTimestamp();

    await this.sendToChannel(guildId, config.applicationChannelId, embed);
  }

  async logApplicationVote(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.application_votes) return;

    const voteColor = data.vote === 'accept' ? COLORS.SUCCESS : COLORS.ERROR;
    const voteIcon = data.vote === 'accept' ? '✅' : '❌';

    const embed = new EmbedBuilder()
      .setTitle(`${voteIcon} Vote Cast`)
      .setColor(voteColor)
      .setDescription(`**${data.guildName}** application received a vote`)
      .addFields(
        { name: '🗳️ Voter', value: `<@${data.voterId}>`, inline: true },
        { name: '👤 Applicant', value: `<@${data.applicantId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '📊 Vote', value: data.vote === 'accept' ? '**Accept**' : '**Deny**', inline: true },
        { name: '✅ Accepts', value: `${data.acceptCount}`, inline: true },
        { name: '❌ Denies', value: `${data.denyCount}`, inline: true }
      )
      .setFooter({ text: `Application ID: ${data.applicationId}` })
      .setTimestamp();

    if (data.acceptVoters && data.acceptVoters.length > 0) {
      embed.addFields({
        name: '✅ Accept Voters',
        value: data.acceptVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }

    if (data.denyVoters && data.denyVoters.length > 0) {
      embed.addFields({
        name: '❌ Deny Voters',
        value: data.denyVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }

    await this.sendToChannel(guildId, config.applicationChannelId, embed);
  }

  async logApplicationDecision(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.guild_applications) return;

    const approved = data.status === 'approved';
    
    const embed = new EmbedBuilder()
      .setTitle(approved ? '✅ Application Approved' : '❌ Application Denied')
      .setColor(approved ? COLORS.SUCCESS : COLORS.ERROR)
      .setDescription(`**${data.guildName}** application has been ${data.status}`)
      .addFields(
        { name: '👤 Applicant', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🏰 Guild', value: data.guildName, inline: true },
        { name: '✅ Accept Votes', value: `${data.acceptCount}`, inline: true },
        { name: '❌ Deny Votes', value: `${data.denyCount}`, inline: true },
        { name: '📊 Status', value: data.status.toUpperCase(), inline: true }
      )
      .setFooter({ text: `Application ID: ${data.applicationId}` })
      .setTimestamp();

    if (data.acceptVoters && data.acceptVoters.length > 0) {
      embed.addFields({
        name: '✅ Voted to Accept',
        value: data.acceptVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }

    if (data.denyVoters && data.denyVoters.length > 0) {
      embed.addFields({
        name: '❌ Voted to Deny',
        value: data.denyVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }

    await this.sendToChannel(guildId, config.applicationChannelId, embed);
  }

  async logApplicationOverride(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.admin_overrides) return;

    const approved = data.decision === 'approved';
    
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Admin Override')
      .setColor(COLORS.WARNING)
      .setDescription(`An admin manually ${approved ? 'approved' : 'denied'} an application`)
      .addFields(
        { name: '👑 Admin', value: `<@${data.adminId}>`, inline: true },
        { name: '👤 Applicant', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🏰 Guild', value: data.guildName, inline: true },
        { name: '📊 Decision', value: approved ? '✅ APPROVED' : '❌ DENIED', inline: true }
      )
      .addFields({
        name: '📝 Vote History',
        value: `Accept: ${data.acceptCount} | Deny: ${data.denyCount}`,
        inline: false
      })
      .setFooter({ text: `Application ID: ${data.applicationId} | Manual Override` })
      .setTimestamp();

    await this.sendToChannel(guildId, config.applicationChannelId, embed);
  }

  async logVerification(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.verification) return;

    const embed = new EmbedBuilder()
      .setTitle(data.type === 'player' ? '🎮 New Player Verified' : '👋 Visitor Joined')
      .setColor(data.type === 'player' ? COLORS.SUCCESS : COLORS.PRIMARY)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '📊 Type', value: data.type === 'player' ? 'Player' : 'Visitor', inline: true }
      )
      .setTimestamp();

    await this.sendToChannel(guildId, config.generalChannelId, embed);
  }

  async logRoleChange(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.role_changes) return;

    const embed = new EmbedBuilder()
      .setTitle('🎭 Role Updated')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '📊 Action', value: data.action === 'add' ? 'Added' : 'Removed', inline: true },
        { name: '🎭 Role', value: `<@&${data.roleId}>`, inline: true }
      )
      .setTimestamp();

    await this.sendToChannel(guildId, config.generalChannelId, embed);
  }

  async logSettingsChange(guildId, data) {
    const config = await this.getSettings(guildId);
    if (!config.settings?.settings_changes) return;

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Settings Changed')
      .setColor(COLORS.WARNING)
      .addFields(
        { name: '👑 Admin', value: `<@${data.adminId}>`, inline: true },
        { name: '🔧 Setting', value: data.setting, inline: true },
        { name: '📥 Value', value: `\`${data.value}\``, inline: true }
      )
      .setTimestamp();

    await this.sendToChannel(guildId, config.generalChannelId, embed);
  }
}

// Export singleton instance
export const Logger = new ProfessionalLogger();
export default Logger;
