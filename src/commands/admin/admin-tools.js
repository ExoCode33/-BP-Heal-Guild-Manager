import discord from 'discord.js';
const { 
  SlashCommandBuilder,
  EmbedBuilder, 
  ActionRowBuilder,
  StringSelectMenuBuilder
} = discord;
import db from '../../services/database.js';
import sheetsService from '../../services/sheets.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';
import performanceMonitor from '../../utils/performanceMonitor.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-tools')
    .setDescription('Admin tools and bot configuration')
    .setDefaultMemberPermissions('8')
    .addSubcommand(sub => 
      sub.setName('spreadsheet-sync')
        .setDescription('Force sync to Google Sheets')
    )
    .addSubcommand(sub => 
      sub.setName('logger-config')
        .setDescription('Configure logging settings')
    )
    .addSubcommand(sub => 
      sub.setName('logger-status')
        .setDescription('View current logger configuration')
    )
    .addSubcommand(sub =>
      sub.setName('log-cleanup')
        .setDescription('Manually trigger Discord log cleanup')
    )
    .addSubcommand(sub =>
      sub.setName('memory-status')
        .setDescription('View memory and performance status')
    )
    .addSubcommand(sub =>
      sub.setName('force-gc')
        .setDescription('Force garbage collection (requires --expose-gc)')
    ),
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'spreadsheet-sync') {
        await handleSync(interaction);
      } else if (subcommand === 'logger-config') {
        await handleLoggerConfig(interaction);
      } else if (subcommand === 'logger-status') {
        await handleLoggerStatus(interaction);
      } else if (subcommand === 'log-cleanup') {
        await handleLogCleanup(interaction);
      } else if (subcommand === 'memory-status') {
        await handleMemoryStatus(interaction);
      } else if (subcommand === 'force-gc') {
        await handleForceGC(interaction);
      }
    } catch (error) {
      logger.error(`Admin tools error: ${error.message}`);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error occurred.', 
          ephemeral: config.ephemeral.admin 
        });
      } else {
        await interaction.editReply({ content: '❌ Error occurred.' });
      }
    }
  }
};

// ============================================================================
// SYNC HANDLER
// ============================================================================

async function handleSync(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const startTime = Date.now();
    const allChars = await db.getAllUsersWithCharacters();
    
    const enrichedChars = await Promise.all(
      allChars.map(async (char) => {
        let discordName = char.user_id;
        try {
          const user = await interaction.client.users.fetch(char.user_id);
          discordName = user.username;
          if (interaction.guild) {
            try {
              const member = await interaction.guild.members.fetch(char.user_id);
              if (member.nickname) discordName = member.nickname;
            } catch (error) {}
          }
        } catch (error) {}
        return { ...char, discord_name: discordName };
      })
    );
    
    await sheetsService.syncAllCharacters(enrichedChars);
    const duration = Date.now() - startTime;
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Google Sheets Sync Complete')
      .setDescription(`Successfully synced ${enrichedChars.length} characters to Google Sheets.`)
      .addFields(
        { name: 'Duration', value: `${duration}ms`, inline: true },
        { name: 'Characters', value: enrichedChars.length.toString(), inline: true }
      )
      .setFooter({ text: `Synced by ${interaction.user.username}` })
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed] });
    await logger.logSuccess(`Admin ${interaction.user.username} forced Google Sheets sync`, `${enrichedChars.length} characters in ${duration}ms`);
  } catch (error) {
    logger.error(`Sync error: ${error.message}`);
    await interaction.editReply({ content: '❌ Sync failed. Check logs for details.' });
  }
}

// ============================================================================
// LOG CLEANUP HANDLER
// ============================================================================

async function handleLogCleanup(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    // Run cleanup and get count
    const deleted = await logger.manualCleanup();
    
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('🧹 Log Cleanup Complete')
      .setDescription(`Discord log cleanup has been executed.`)
      .addFields(
        { name: 'Messages Deleted', value: deleted.toString(), inline: true },
        { name: 'Total Sent', value: logger.stats.messagesSent.toString(), inline: true },
        { name: 'Total Deleted (All Time)', value: logger.stats.messagesDeleted.toString(), inline: true }
      )
      .setFooter({ text: `Executed by ${interaction.user.username}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    await logger.logInfo(`Admin ${interaction.user.username} triggered log cleanup`, `Deleted ${deleted} messages`);
  } catch (error) {
    logger.error(`Log cleanup error: ${error.message}`);
    await interaction.editReply({ content: '❌ Cleanup failed. Check logs for details.' });
  }
}

// ============================================================================
// PERFORMANCE HANDLERS
// ============================================================================

async function handlePerformance(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const report = performanceMonitor.generateReport();
    const memStats = report.memory;
    const leak = report.leak;
    
    const embed = new EmbedBuilder()
      .setColor('#3B82F6')
      .setTitle('📊 Performance Report')
      .setDescription('Comprehensive system performance metrics')
      .addFields(
        { 
          name: '💾 Memory Usage', 
          value: `${memStats.current.heapUsed}MB / ${memStats.current.heapTotal}MB (${memStats.current.heapPercent}%)\nRSS: ${memStats.current.rss}MB`,
          inline: false 
        },
        { 
          name: '📈 Memory Stats', 
          value: `Peak: ${memStats.stats.peak}MB\nLowest: ${memStats.stats.lowest}MB\nAverage: ${memStats.stats.average}MB`,
          inline: true 
        },
        { 
          name: '🔧 System', 
          value: `GC Triggers: ${memStats.stats.gcTriggers}\nWarnings: ${memStats.stats.warnings}\nCriticals: ${memStats.stats.criticals}`,
          inline: true 
        },
        {
          name: '🔍 Memory Leak Detection',
          value: leak.detected ? `⚠️ ${leak.message}` : `✅ ${leak.message}`,
          inline: false
        }
      );
    
    // Add top commands if any
    if (report.commands.length > 0) {
      const commandsText = report.commands.map(cmd => 
        `**/${cmd.command}**: ${cmd.count} uses, avg ${cmd.avgDuration}ms`
      ).join('\n');
      embed.addFields({ name: '⚡ Top Commands', value: commandsText, inline: false });
    }
    
    // Add slowest queries if any
    if (report.queries.length > 0) {
      const queriesText = report.queries.slice(0, 3).map(q => 
        `**${q.operation}**: avg ${q.avgDuration}ms`
      ).join('\n');
      embed.addFields({ name: '🐌 Slowest Queries', value: queriesText, inline: false });
    }
    
    embed.setFooter({ text: `Uptime: ${memStats.stats.uptime}` });
    embed.setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`Performance report error: ${error.message}`);
    await interaction.editReply({ content: '❌ Failed to generate performance report.' });
  }
}

async function handleMemoryStatus(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const stats = performanceMonitor.getStats();
    
    if (stats.error) {
      return await interaction.editReply({ 
        content: '❌ Performance monitor not ready yet. Please wait a moment.' 
      });
    }
    
    const healthColor = stats.health.score >= 70 ? '#10B981' : 
                        stats.health.score >= 50 ? '#F59E0B' : '#EF4444';
    
    const embed = new EmbedBuilder()
      .setColor(healthColor)
      .setTitle(`${getHealthIcon(stats.health.score)} Performance Status`)
      .setDescription(`**Health:** ${stats.health.status} (${stats.health.score}/100)`)
      .addFields(
        { 
          name: '💾 Current Memory', 
          value: `**Heap:** ${stats.current.heapUsed}MB / ${stats.current.heapTotal}MB (${stats.current.heapPercent}%)\n**RSS:** ${stats.current.rss}MB\n**External:** ${stats.current.external}MB`, 
          inline: true 
        },
        { 
          name: '📊 Statistics', 
          value: `**Peak:** ${stats.peaks.memory}MB\n**Average:** ${stats.averages.memory}MB\n**Trend:** ${getTrendIcon(stats.trends.memory)} ${stats.trends.memory}`, 
          inline: true 
        },
        { 
          name: '⚡ CPU', 
          value: `**Current:** ${stats.currentCPU.percent}%\n**Peak:** ${stats.peaks.cpu}%\n**Average:** ${stats.averages.cpu}%`, 
          inline: true 
        },
        { 
          name: '⚙️ Garbage Collection', 
          value: `**Triggers:** ${stats.stats.gcTriggers}\n**Available:** ${global.gc ? '✅ Yes' : '❌ No'}`, 
          inline: true 
        },
        { 
          name: '⚠️ Alerts', 
          value: `**Warnings:** ${stats.stats.warnings}\n**Criticals:** ${stats.stats.criticals}`, 
          inline: true 
        },
        { 
          name: '📈 Thresholds', 
          value: `**Warning:** ${stats.thresholds.memory.warning}MB\n**Critical:** ${stats.thresholds.memory.critical}MB\n**GC:** ${stats.thresholds.memory.gc}MB`, 
          inline: true 
        }
      );
    
    // Add issues
    if (stats.health.issues.length > 0) {
      embed.addFields({
        name: '🚨 Active Issues',
        value: stats.health.issues.map(issue => `• ${issue}`).join('\n'),
        inline: false
      });
    }
    
    // Add alerts
    if (stats.alerts.length > 0) {
      const alertsText = stats.alerts.slice(0, 3).map(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : '🟡';
        return `${icon} ${alert.message}`;
      }).join('\n');
      
      embed.addFields({
        name: '📢 Recent Alerts',
        value: alertsText,
        inline: false
      });
    }
    
    // Add recommendations
    if (stats.recommendations.length > 0) {
      const recsText = stats.recommendations.slice(0, 2).map(rec => {
        return `• **${rec.title}:** ${rec.description}`;
      }).join('\n');
      
      embed.addFields({
        name: '💡 Recommendations',
        value: recsText,
        inline: false
      });
    }
    
    embed.setFooter({ 
      text: `Uptime: ${stats.stats.uptime} | Data Points: ${stats.stats.metricsCollected}` 
    }).setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.logError('Admin', 'Memory status error', error);
    await interaction.editReply({ content: '❌ Failed to get memory status.' });
  }
}

function getHealthIcon(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

function getTrendIcon(trend) {
  if (trend === 'increasing') return '📈';
  if (trend === 'decreasing') return '📉';
  return '➡️';
}
    
async function handleForceGC(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    if (!global.gc) {
      const embed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle('❌ GC Not Available')
        .setDescription('Garbage collection is not exposed. Bot must be started with `--expose-gc` flag.')
        .addFields(
          { name: 'Current Start Command', value: '`node src/index.js`', inline: false },
          { name: 'Required Command', value: '`node --expose-gc src/index.js`', inline: false }
        )
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }
    
    const result = performanceMonitor.triggerGarbageCollection('admin-manual');
    
    if (!result) {
      return await interaction.editReply({ content: '❌ GC failed.' });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#10B981')
      .setTitle('♻️ Garbage Collection Complete')
      .setDescription('Manual garbage collection has been executed.')
      .addFields(
        { name: 'Before', value: `${result.before}MB`, inline: true },
        { name: 'After', value: `${result.after}MB`, inline: true },
        { name: 'Freed', value: `${result.freed}MB`, inline: true }
      )
      .setFooter({ text: `Executed by ${interaction.user.username}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    await logger.logInfo(`Admin ${interaction.user.username} forced garbage collection`, `Freed ${result.freed}MB`);
  } catch (error) {
    logger.error(`Force GC error: ${error.message}`);
    await interaction.editReply({ content: '❌ Failed to force GC.' });
  }
}

// ============================================================================
// LOGGER CONFIG HANDLER
// ============================================================================

async function handleLoggerConfig(interaction) {
  try {
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('⚙️ Logger Configuration')
      .setDescription('Choose a setting to configure:')
      .addFields(
        { name: '📊 Log Level', value: 'Set the verbosity of Discord logging', inline: false },
        { name: '📺 Log Channel', value: 'Set the Discord channel for logs', inline: false },
        { name: '🔔 Error Ping', value: 'Configure error role ping', inline: false },
        { name: '⚠️ Warning Ping', value: 'Configure warning role ping', inline: false },
        { name: '🐛 Debug Mode', value: 'Toggle debug console logging', inline: false }
      )
      .setTimestamp();
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`admin_logger_config_${interaction.user.id}`)
      .setPlaceholder('⚙️ Choose a setting')
      .addOptions([
        { label: 'Log Level', value: 'log_level', description: 'ERROR_ONLY, WARN_ERROR, INFO, VERBOSE, DEBUG, ALL', emoji: '📊' },
        { label: 'Log Channel', value: 'log_channel', description: 'Set the Discord channel for logs', emoji: '📺' },
        { label: 'Error Ping Settings', value: 'error_ping', description: 'Configure error role ping', emoji: '🔔' },
        { label: 'Warning Ping Settings', value: 'warn_ping', description: 'Configure warning role ping', emoji: '⚠️' },
        { label: 'Debug Mode', value: 'debug_mode', description: 'Toggle debug console logging', emoji: '🐛' }
      ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: config.ephemeral.admin });
  } catch (error) {
    logger.error(`Logger config error: ${error.message}`);
    await interaction.reply({ content: '❌ Error showing config menu.', ephemeral: config.ephemeral.admin });
  }
}

// ============================================================================
// LOGGER STATUS HANDLER
// ============================================================================

async function handleLoggerStatus(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const settings = await db.getAllBotSettings();
    
    let channelName = 'Not set';
    if (settings.log_channel_id) {
      try {
        const channel = await interaction.client.channels.fetch(settings.log_channel_id);
        channelName = channel ? `#${channel.name}` : 'Invalid channel';
      } catch (error) {
        channelName = 'Invalid channel';
      }
    }
    
    let errorRoleName = 'Not set';
    if (settings.error_ping_role_id && interaction.guild) {
      try {
        const role = await interaction.guild.roles.fetch(settings.error_ping_role_id);
        errorRoleName = role ? `@${role.name}` : 'Invalid role';
      } catch (error) {
        errorRoleName = 'Invalid role';
      }
    }
    
    let warnRoleName = 'Not set';
    if (settings.warn_ping_role_id && interaction.guild) {
      try {
        const role = await interaction.guild.roles.fetch(settings.warn_ping_role_id);
        warnRoleName = role ? `@${role.name}` : 'Invalid role';
      } catch (error) {
        warnRoleName = 'Invalid role';
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('📊 Logger Status')
      .setDescription('Current logger configuration:')
      .addFields(
        { name: '📊 Log Level', value: settings.log_level || 'INFO', inline: true },
        { name: '🐛 Debug Mode', value: settings.debug_mode ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '📺 Log Channel', value: channelName, inline: false },
        { name: '🔔 Error Ping', value: settings.error_ping_enabled ? `✅ Enabled → ${errorRoleName}` : '❌ Disabled', inline: false },
        { name: '⚠️ Warning Ping', value: settings.warn_ping_enabled ? `✅ Enabled → ${warnRoleName}` : '❌ Disabled', inline: false }
      )
      .setFooter({ text: 'Use /admin-tools logger-config to change settings' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`Logger status error: ${error.message}`);
    await interaction.editReply({ content: '❌ Error fetching logger status.' });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
