import { 
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import db from '../services/database.js';
import logger from '../utils/logger.js';

// ============================================================================
// HANDLE LOGGER CONFIG SELECT MENU
// ============================================================================

export async function handleLoggerConfigSelect(interaction, userId) {
  const selected = interaction.values[0];
  
  try {
    if (selected === 'log_level') {
      await showLogLevelSelect(interaction, userId);
    } else if (selected === 'log_channel') {
      await showLogChannelModal(interaction, userId);
    } else if (selected === 'error_ping') {
      await showErrorPingConfig(interaction, userId);
    } else if (selected === 'warn_ping') {
      await showWarnPingConfig(interaction, userId);
    } else if (selected === 'debug_mode') {
      await toggleDebugMode(interaction, userId);
    }
  } catch (error) {
    logger.error(`Logger config select error: ${error.message}`);
    await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
}

// ============================================================================
// HELPER FUNCTION - RETURN TO MAIN CONFIG MENU
// ============================================================================

async function returnToMainConfigMenu(interaction, userId, successMessage = '') {
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('⚙️ Logger Configuration')
    .setDescription((successMessage ? `${successMessage}\n\n` : '') + 'Choose another setting to configure:')
    .addFields(
      { name: '📊 Log Level', value: 'Set the verbosity of Discord logging', inline: false },
      { name: '📺 Log Channel', value: 'Set the Discord channel for logs', inline: false },
      { name: '🔔 Error Ping', value: 'Configure error role ping', inline: false },
      { name: '⚠️ Warning Ping', value: 'Configure warning role ping', inline: false },
      { name: '🐛 Debug Mode', value: 'Toggle debug console logging', inline: false }
    )
    .setTimestamp();
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`admin_logger_config_${userId}`)
    .setPlaceholder('⚙️ Choose a setting')
    .addOptions([
      {
        label: 'Log Level',
        value: 'log_level',
        description: 'ERROR_ONLY, WARN_ERROR, INFO, VERBOSE, DEBUG, ALL',
        emoji: '📊'
      },
      {
        label: 'Log Channel',
        value: 'log_channel',
        description: 'Set the Discord channel for logs',
        emoji: '📺'
      },
      {
        label: 'Error Ping Settings',
        value: 'error_ping',
        description: 'Configure error role ping',
        emoji: '🔔'
      },
      {
        label: 'Warning Ping Settings',
        value: 'warn_ping',
        description: 'Configure warning role ping',
        emoji: '⚠️'
      },
      {
        label: 'Debug Mode',
        value: 'debug_mode',
        description: 'Toggle debug console logging',
        emoji: '🐛'
      }
    ]);
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  return { embeds: [embed], components: [row] };
}

// ============================================================================
// LOG LEVEL CONFIGURATION
// ============================================================================

async function showLogLevelSelect(interaction, userId) {
  const currentLevel = await db.getBotSetting('log_level') || 'INFO';
  
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('📊 Configure Log Level')
    .setDescription(`**Current:** ${currentLevel}\n\nChoose the verbosity level for Discord logging:`)
    .addFields(
      { name: 'ERROR_ONLY', value: 'Only log errors', inline: true },
      { name: 'WARN_ERROR', value: 'Warnings + errors', inline: true },
      { name: 'INFO', value: 'Info + above *(recommended)*', inline: true },
      { name: 'VERBOSE', value: 'Commands, actions + above', inline: true },
      { name: 'DEBUG', value: 'DB queries, interactions + above', inline: true },
      { name: 'ALL', value: 'Everything including profile views', inline: true }
    )
    .setFooter({ text: 'Higher levels include all lower levels' })
    .setTimestamp();
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`admin_set_log_level_${userId}`)
    .setPlaceholder('📊 Choose log level')
    .addOptions([
      { label: 'ERROR_ONLY', value: 'ERROR_ONLY', description: 'Only errors' },
      { label: 'WARN_ERROR', value: 'WARN_ERROR', description: 'Warnings + errors' },
      { label: 'INFO', value: 'INFO', description: 'Info + warnings + errors' },
      { label: 'VERBOSE', value: 'VERBOSE', description: 'Commands, registrations + above' },
      { label: 'DEBUG', value: 'DEBUG', description: 'Interactions, database + above' },
      { label: 'ALL', value: 'ALL', description: 'Everything including views' }
    ]);
  
  const backButton = new ButtonBuilder()
    .setCustomId(`admin_logger_back_${userId}`)
    .setLabel('◀️ Back to Logger Settings')
    .setStyle(ButtonStyle.Secondary);
  
  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);
  
  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleSetLogLevel(interaction, userId) {
  const newLevel = interaction.values[0];
  
  try {
    await db.setBotSetting('log_level', newLevel, 'string', 'Discord log level', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    
    // Return to main config menu
    const menuData = await returnToMainConfigMenu(
      interaction, 
      userId, 
      `✅ **Log level updated to: ${newLevel}**`
    );
    
    await interaction.update(menuData);
    
    await logger.logInfo(
      `Admin ${interaction.user.username} changed log level to ${newLevel}`,
      `User ID: ${userId}`
    );
    
  } catch (error) {
    logger.error(`Set log level error: ${error.message}`);
    await interaction.update({ content: '❌ Failed to update log level.', embeds: [], components: [] });
  }
}

// ============================================================================
// LOG CHANNEL CONFIGURATION
// ============================================================================

async function showLogChannelModal(interaction, userId) {
  const currentChannel = await db.getBotSetting('log_channel_id') || '';
  
  const modal = new ModalBuilder()
    .setCustomId(`admin_set_log_channel_${userId}`)
    .setTitle('📺 Set Log Channel');
  
  const channelInput = new TextInputBuilder()
    .setCustomId('channel_id')
    .setLabel('Discord Channel ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('1234567890123456789')
    .setValue(currentChannel)
    .setRequired(true)
    .setMaxLength(20);
  
  const row = new ActionRowBuilder().addComponents(channelInput);
  modal.addComponents(row);
  
  await interaction.showModal(modal);
}

export async function handleSetLogChannelModal(interaction, userId) {
  const channelId = interaction.fields.getTextInputValue('channel_id').trim();
  
  try {
    // Validate channel exists and bot has access
    const channel = await interaction.client.channels.fetch(channelId);
    
    if (!channel) {
      return await interaction.reply({ 
        content: '❌ Invalid channel ID or bot doesn\'t have access.', 
        ephemeral: true 
      });
    }
    
    if (!channel.isTextBased()) {
      return await interaction.reply({ 
        content: '❌ Channel must be a text channel.', 
        ephemeral: true 
      });
    }
    
    // Save to database
    await db.setBotSetting('log_channel_id', channelId, 'string', 'Discord log channel ID', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    await logger.setClient(interaction.client, channelId, false);
    
    // Return to main config menu
    const menuData = await returnToMainConfigMenu(
      interaction,
      userId,
      `✅ **Log channel updated to: <#${channelId}>**`
    );
    
    await interaction.reply({ ...menuData, ephemeral: true });
    
    await logger.logInfo(
      `Admin ${interaction.user.username} changed log channel`,
      `Channel ID: ${channelId}`
    );
    
  } catch (error) {
    logger.error(`Set log channel error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Failed to set log channel. Make sure the ID is valid and the bot has access.', 
      ephemeral: true 
    });
  }
}

// ============================================================================
// ERROR PING CONFIGURATION
// ============================================================================

async function showErrorPingConfig(interaction, userId) {
  const enabled = await db.getBotSetting('error_ping_enabled') || false;
  const roleId = await db.getBotSetting('error_ping_role_id') || '';
  
  let roleName = 'Not set';
  if (roleId && interaction.guild) {
    try {
      const role = await interaction.guild.roles.fetch(roleId);
      roleName = role ? `@${role.name}` : 'Invalid role';
    } catch (error) {
      roleName = 'Invalid role';
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🔔 Configure Error Ping')
    .setDescription(`**Current Status:** ${enabled ? '✅ Enabled' : '❌ Disabled'}\n**Current Role:** ${roleName}`)
    .addFields(
      { name: 'What is this?', value: 'When enabled, the bot will mention a role when errors occur in Discord logs.' },
      { name: 'How to configure', value: '1. Toggle enable/disable\n2. Set the role ID to ping' }
    )
    .setTimestamp();
  
  const toggleButton = new ButtonBuilder()
    .setCustomId(`admin_toggle_error_ping_${userId}`)
    .setLabel(enabled ? 'Disable Error Ping' : 'Enable Error Ping')
    .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji(enabled ? '❌' : '✅');
  
  const setRoleButton = new ButtonBuilder()
    .setCustomId(`admin_set_error_role_${userId}`)
    .setLabel('Set Role')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🔔');
  
  const backButton = new ButtonBuilder()
    .setCustomId(`admin_logger_back_${userId}`)
    .setLabel('◀️ Back to Logger Settings')
    .setStyle(ButtonStyle.Secondary);
  
  const row1 = new ActionRowBuilder().addComponents(toggleButton, setRoleButton);
  const row2 = new ActionRowBuilder().addComponents(backButton);
  
  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleToggleErrorPing(interaction, userId) {
  const currentEnabled = await db.getBotSetting('error_ping_enabled') || false;
  const newEnabled = !currentEnabled;
  
  try {
    await db.setBotSetting('error_ping_enabled', String(newEnabled), 'boolean', 'Enable error role ping', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    
    // Return to main config menu
    const statusText = newEnabled ? '✅ **Error ping enabled**' : '❌ **Error ping disabled**';
    const menuData = await returnToMainConfigMenu(interaction, userId, statusText);
    
    await interaction.update(menuData);
    
    await logger.logInfo(
      `Admin ${interaction.user.username} ${newEnabled ? 'enabled' : 'disabled'} error ping`,
      `User ID: ${userId}`
    );
    
  } catch (error) {
    logger.error(`Toggle error ping error: ${error.message}`);
    await interaction.update({ content: '❌ Failed to toggle error ping.', embeds: [], components: [] });
  }
}

export async function handleSetErrorRoleModal(interaction, userId) {
  const modal = new ModalBuilder()
    .setCustomId(`admin_set_error_role_modal_${userId}`)
    .setTitle('🔔 Set Error Ping Role');
  
  const currentRole = await db.getBotSetting('error_ping_role_id') || '';
  
  const roleInput = new TextInputBuilder()
    .setCustomId('role_id')
    .setLabel('Discord Role ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('1234567890123456789')
    .setValue(currentRole)
    .setRequired(true)
    .setMaxLength(20);
  
  const row = new ActionRowBuilder().addComponents(roleInput);
  modal.addComponents(row);
  
  await interaction.showModal(modal);
}

export async function handleSetErrorRoleSubmit(interaction, userId) {
  const roleId = interaction.fields.getTextInputValue('role_id').trim();
  
  try {
    // Validate role exists
    if (interaction.guild) {
      const role = await interaction.guild.roles.fetch(roleId);
      
      if (!role) {
        return await interaction.reply({ 
          content: '❌ Invalid role ID.', 
          ephemeral: true 
        });
      }
    }
    
    await db.setBotSetting('error_ping_role_id', roleId, 'string', 'Error ping role ID', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    
    // Return to main config menu
    const menuData = await returnToMainConfigMenu(
      interaction,
      userId,
      `✅ **Error ping role updated to: <@&${roleId}>**`
    );
    
    await interaction.reply({ ...menuData, ephemeral: true });
    
    await logger.logInfo(
      `Admin ${interaction.user.username} set error ping role`,
      `Role ID: ${roleId}`
    );
    
  } catch (error) {
    logger.error(`Set error role error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Failed to set error role. Make sure the ID is valid.', 
      ephemeral: true 
    });
  }
}

// ============================================================================
// WARNING PING CONFIGURATION (Similar to Error Ping)
// ============================================================================

async function showWarnPingConfig(interaction, userId) {
  const enabled = await db.getBotSetting('warn_ping_enabled') || false;
  const roleId = await db.getBotSetting('warn_ping_role_id') || '';
  
  let roleName = 'Not set';
  if (roleId && interaction.guild) {
    try {
      const role = await interaction.guild.roles.fetch(roleId);
      roleName = role ? `@${role.name}` : 'Invalid role';
    } catch (error) {
      roleName = 'Invalid role';
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('⚠️ Configure Warning Ping')
    .setDescription(`**Current Status:** ${enabled ? '✅ Enabled' : '❌ Disabled'}\n**Current Role:** ${roleName}`)
    .addFields(
      { name: 'What is this?', value: 'When enabled, the bot will mention a role when warnings occur in Discord logs.' },
      { name: 'How to configure', value: '1. Toggle enable/disable\n2. Set the role ID to ping' }
    )
    .setTimestamp();
  
  const toggleButton = new ButtonBuilder()
    .setCustomId(`admin_toggle_warn_ping_${userId}`)
    .setLabel(enabled ? 'Disable Warning Ping' : 'Enable Warning Ping')
    .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji(enabled ? '❌' : '✅');
  
  const setRoleButton = new ButtonBuilder()
    .setCustomId(`admin_set_warn_role_${userId}`)
    .setLabel('Set Role')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('⚠️');
  
  const backButton = new ButtonBuilder()
    .setCustomId(`admin_logger_back_${userId}`)
    .setLabel('◀️ Back to Logger Settings')
    .setStyle(ButtonStyle.Secondary);
  
  const row1 = new ActionRowBuilder().addComponents(toggleButton, setRoleButton);
  const row2 = new ActionRowBuilder().addComponents(backButton);
  
  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleToggleWarnPing(interaction, userId) {
  const currentEnabled = await db.getBotSetting('warn_ping_enabled') || false;
  const newEnabled = !currentEnabled;
  
  try {
    await db.setBotSetting('warn_ping_enabled', String(newEnabled), 'boolean', 'Enable warning role ping', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    
    // Return to main config menu
    const statusText = newEnabled ? '✅ **Warning ping enabled**' : '❌ **Warning ping disabled**';
    const menuData = await returnToMainConfigMenu(interaction, userId, statusText);
    
    await interaction.update(menuData);
    
    await logger.logInfo(
      `Admin ${interaction.user.username} ${newEnabled ? 'enabled' : 'disabled'} warning ping`,
      `User ID: ${userId}`
    );
    
  } catch (error) {
    logger.error(`Toggle warning ping error: ${error.message}`);
    await interaction.update({ content: '❌ Failed to toggle warning ping.', embeds: [], components: [] });
  }
}

export async function handleSetWarnRoleModal(interaction, userId) {
  const modal = new ModalBuilder()
    .setCustomId(`admin_set_warn_role_modal_${userId}`)
    .setTitle('⚠️ Set Warning Ping Role');
  
  const currentRole = await db.getBotSetting('warn_ping_role_id') || '';
  
  const roleInput = new TextInputBuilder()
    .setCustomId('role_id')
    .setLabel('Discord Role ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('1234567890123456789')
    .setValue(currentRole)
    .setRequired(true)
    .setMaxLength(20);
  
  const row = new ActionRowBuilder().addComponents(roleInput);
  modal.addComponents(row);
  
  await interaction.showModal(modal);
}

export async function handleSetWarnRoleSubmit(interaction, userId) {
  const roleId = interaction.fields.getTextInputValue('role_id').trim();
  
  try {
    // Validate role exists
    if (interaction.guild) {
      const role = await interaction.guild.roles.fetch(roleId);
      
      if (!role) {
        return await interaction.reply({ 
          content: '❌ Invalid role ID.', 
          ephemeral: true 
        });
      }
    }
    
    await db.setBotSetting('warn_ping_role_id', roleId, 'string', 'Warning ping role ID', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    
    // Return to main config menu
    const menuData = await returnToMainConfigMenu(
      interaction,
      userId,
      `✅ **Warning ping role updated to: <@&${roleId}>**`
    );
    
    await interaction.reply({ ...menuData, ephemeral: true });
    
    await logger.logInfo(
      `Admin ${interaction.user.username} set warning ping role`,
      `Role ID: ${roleId}`
    );
    
  } catch (error) {
    logger.error(`Set warning role error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Failed to set warning role. Make sure the ID is valid.', 
      ephemeral: true 
    });
  }
}

// ============================================================================
// DEBUG MODE TOGGLE
// ============================================================================

async function toggleDebugMode(interaction, userId) {
  const currentDebug = await db.getBotSetting('debug_mode') || false;
  const newDebug = !currentDebug;
  
  try {
    await db.setBotSetting('debug_mode', String(newDebug), 'boolean', 'Enable debug console logging', userId);
    
    // Reload logger configuration
    await logger.loadSettingsFromDatabase(db);
    
    // Return to main config menu
    const statusText = newDebug ? '✅ **Debug mode enabled**' : '❌ **Debug mode disabled**';
    const menuData = await returnToMainConfigMenu(interaction, userId, statusText);
    
    await interaction.update(menuData);
    
    await logger.logInfo(
      `Admin ${interaction.user.username} ${newDebug ? 'enabled' : 'disabled'} debug mode`,
      `User ID: ${userId}`
    );
    
  } catch (error) {
    logger.error(`Toggle debug mode error: ${error.message}`);
    await interaction.update({ content: '❌ Failed to toggle debug mode.', embeds: [], components: [] });
  }
}

// ============================================================================
// BACK BUTTON HANDLER
// ============================================================================

export async function handleLoggerBackButton(interaction, userId) {
  try {
    const menuData = await returnToMainConfigMenu(interaction, userId);
    await interaction.update(menuData);
  } catch (error) {
    logger.error(`Logger back button error: ${error.message}`);
    await interaction.update({ content: '❌ Error occurred.', embeds: [], components: [] });
  }
}

export default {
  handleLoggerConfigSelect,
  handleSetLogLevel,
  handleSetLogChannelModal,
  handleToggleErrorPing,
  handleSetErrorRoleModal,
  handleSetErrorRoleSubmit,
  handleToggleWarnPing,
  handleSetWarnRoleModal,
  handleSetWarnRoleSubmit,
  handleLoggerBackButton
};
