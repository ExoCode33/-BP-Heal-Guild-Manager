import { 
  EmbedBuilder, 
  StringSelectMenuBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelSelectMenuBuilder, 
  ChannelType, 
  MessageFlags 
} from 'discord.js';
import pool from '../database/index.js';
import { COLORS } from '../config/game.js';

// ═══════════════════════════════════════════════════════════════════
// DATABASE HELPERS
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS = {
  character_registration: true,
  character_updates: true,
  character_deletion: true,
  verification: true,
  guild_applications: true,
  application_votes: true,
  admin_overrides: true,
  settings_changes: true,
  role_changes: true
};

async function ensureGuildSettings(guildId) {
  try {
    const check = await pool.query(
      'SELECT guild_id FROM guild_settings WHERE guild_id = $1',
      [guildId]
    );
    
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO guild_settings (guild_id, log_settings) VALUES ($1, $2)`,
        [guildId, JSON.stringify(DEFAULT_SETTINGS)]
      );
    }
    return true;
  } catch (error) {
    console.error('[ADMIN-SETTINGS] ensureGuildSettings error:', error.message);
    return false;
  }
}

async function getLoggingConfig(guildId) {
  try {
    await ensureGuildSettings(guildId);
    
    const result = await pool.query(
      'SELECT general_log_channel_id, application_log_channel_id, log_settings FROM guild_settings WHERE guild_id = $1',
      [guildId]
    );
    
    if (result.rows.length === 0) {
      return {
        generalChannelId: null,
        applicationChannelId: null,
        settings: DEFAULT_SETTINGS
      };
    }
    
    const row = result.rows[0];
    return {
      generalChannelId: row.general_log_channel_id,
      applicationChannelId: row.application_log_channel_id,
      settings: row.log_settings || DEFAULT_SETTINGS
    };
  } catch (error) {
    console.error('[ADMIN-SETTINGS] getLoggingConfig error:', error.message);
    return {
      generalChannelId: null,
      applicationChannelId: null,
      settings: DEFAULT_SETTINGS
    };
  }
}

async function setGeneralChannel(guildId, channelId) {
  try {
    await ensureGuildSettings(guildId);
    await pool.query(
      `UPDATE guild_settings SET general_log_channel_id = $2, updated_at = NOW() WHERE guild_id = $1`,
      [guildId, channelId]
    );
    return true;
  } catch (error) {
    console.error('[ADMIN-SETTINGS] setGeneralChannel error:', error.message);
    return false;
  }
}

async function setApplicationChannel(guildId, channelId) {
  try {
    await ensureGuildSettings(guildId);
    await pool.query(
      `UPDATE guild_settings SET application_log_channel_id = $2, updated_at = NOW() WHERE guild_id = $1`,
      [guildId, channelId]
    );
    return true;
  } catch (error) {
    console.error('[ADMIN-SETTINGS] setApplicationChannel error:', error.message);
    return false;
  }
}

async function toggleEventSetting(guildId, eventType) {
  try {
    await ensureGuildSettings(guildId);
    
    const config = await getLoggingConfig(guildId);
    const newValue = !config.settings[eventType];
    config.settings[eventType] = newValue;
    
    await pool.query(
      `UPDATE guild_settings SET log_settings = $2, updated_at = NOW() WHERE guild_id = $1`,
      [guildId, JSON.stringify(config.settings)]
    );
    
    return { success: true, enabled: newValue, settings: config.settings };
  } catch (error) {
    console.error('[ADMIN-SETTINGS] toggleEventSetting error:', error.message);
    return { success: false };
  }
}

async function setAllEvents(guildId, enabled) {
  try {
    await ensureGuildSettings(guildId);
    
    const settings = {};
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      settings[key] = enabled;
    });
    
    await pool.query(
      `UPDATE guild_settings SET log_settings = $2, updated_at = NOW() WHERE guild_id = $1`,
      [guildId, JSON.stringify(settings)]
    );
    
    return true;
  } catch (error) {
    console.error('[ADMIN-SETTINGS] setAllEvents error:', error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EMBED BUILDERS - PREMIUM DESIGN
// ═══════════════════════════════════════════════════════════════════

function createMainMenuEmbed(config) {
  const generalStatus = config.generalChannelId 
    ? `<#${config.generalChannelId}>` 
    : '`⚠️ Not Set`';
  const appStatus = config.applicationChannelId 
    ? `<#${config.applicationChannelId}>` 
    : '`⚠️ Not Set`';
  
  const enabledCount = Object.values(config.settings || {}).filter(v => v).length;
  const totalCount = Object.keys(config.settings || DEFAULT_SETTINGS).length;
  const percentage = totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0;
  
  // Progress bar
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
  
  return new EmbedBuilder()
    .setTitle('⚙️ Logging Control Center')
    .setDescription(
      '```\n' +
      '╔══════════════════════════════════════╗\n' +
      '║     ADVANCED LOGGING CONFIGURATION   ║\n' +
      '╚══════════════════════════════════════╝\n' +
      '```'
    )
    .setColor(0xEC4899)
    .addFields(
      {
        name: '📡 Channel Configuration',
        value: 
          `**General Logs:** ${generalStatus}\n` +
          `**Application Logs:** ${appStatus}`,
        inline: false
      },
      {
        name: '📊 Event Logging Status',
        value: 
          `\`${progressBar}\` **${percentage}%**\n` +
          `${enabledCount}/${totalCount} events active`,
        inline: false
      },
      {
        name: '\u200b',
        value: '**Select an option below to configure:**',
        inline: false
      }
    )
    .setFooter({ text: '🔧 Tip: Set up channels first, then configure events' })
    .setTimestamp();
}

function createChannelsEmbed(config) {
  const generalStatus = config.generalChannelId 
    ? `✅ <#${config.generalChannelId}>` 
    : '❌ Not Set';
  const appStatus = config.applicationChannelId 
    ? `✅ <#${config.applicationChannelId}>` 
    : '❌ Not Set';

  return new EmbedBuilder()
    .setTitle('📡 Channel Configuration')
    .setDescription(
      '```\n' +
      '╔══════════════════════════════════════╗\n' +
      '║        LOG CHANNEL SETUP             ║\n' +
      '╚══════════════════════════════════════╝\n' +
      '```\n' +
      'Configure separate channels for different log types.'
    )
    .setColor(0x3B82F6)
    .addFields(
      {
        name: '📢 General Logs Channel',
        value: generalStatus,
        inline: true
      },
      {
        name: '📋 Application Logs Channel',
        value: appStatus,
        inline: true
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        inline: false
      },
      {
        name: '📢 General Logs Include',
        value: 
          '```\n' +
          '• Character registration\n' +
          '• Character updates\n' +
          '• Character deletion\n' +
          '• User verification\n' +
          '• Role changes\n' +
          '• Settings changes\n' +
          '```',
        inline: true
      },
      {
        name: '📋 Application Logs Include',
        value: 
          '```\n' +
          '• New applications\n' +
          '• Vote notifications\n' +
          '• Application decisions\n' +
          '• Admin overrides\n' +
          '• Vote summaries\n' +
          '```',
        inline: true
      }
    )
    .setFooter({ text: '💡 Use the dropdowns below to select channels' })
    .setTimestamp();
}

function createEventsEmbed(config) {
  const events = {
    'character_registration': { name: 'Character Registration', emoji: '📝' },
    'character_updates': { name: 'Character Updates', emoji: '✏️' },
    'character_deletion': { name: 'Character Deletion', emoji: '🗑️' },
    'verification': { name: 'User Verification', emoji: '✅' },
    'guild_applications': { name: 'Guild Applications', emoji: '📋' },
    'application_votes': { name: 'Vote Notifications', emoji: '🗳️' },
    'admin_overrides': { name: 'Admin Overrides', emoji: '⚠️' },
    'settings_changes': { name: 'Settings Changes', emoji: '⚙️' },
    'role_changes': { name: 'Role Changes', emoji: '🎭' }
  };

  const settings = config.settings || DEFAULT_SETTINGS;
  const enabledCount = Object.values(settings).filter(v => v).length;
  const totalCount = Object.keys(events).length;

  let eventList = '';
  for (const [key, info] of Object.entries(events)) {
    const status = settings[key] ? '🟢' : '🔴';
    eventList += `${status} ${info.emoji} ${info.name}\n`;
  }

  return new EmbedBuilder()
    .setTitle('🔔 Event Logging Configuration')
    .setDescription(
      '```\n' +
      '╔══════════════════════════════════════╗\n' +
      '║         EVENT TOGGLE PANEL           ║\n' +
      '╚══════════════════════════════════════╝\n' +
      '```\n' +
      'Toggle which events should be logged to Discord channels.'
    )
    .setColor(0x22C55E)
    .addFields(
      {
        name: `📊 Status: ${enabledCount}/${totalCount} Active`,
        value: '```\n' + eventList + '```',
        inline: false
      }
    )
    .setFooter({ text: '💡 Select an event from the dropdown to toggle it' })
    .setTimestamp();
}

function createViewEmbed(config) {
  const events = {
    'character_registration': 'Character Registration',
    'character_updates': 'Character Updates',
    'character_deletion': 'Character Deletion',
    'verification': 'User Verification',
    'guild_applications': 'Guild Applications',
    'application_votes': 'Vote Notifications',
    'admin_overrides': 'Admin Overrides',
    'settings_changes': 'Settings Changes',
    'role_changes': 'Role Changes'
  };

  const settings = config.settings || DEFAULT_SETTINGS;
  let enabled = [];
  let disabled = [];

  for (const [key, name] of Object.entries(events)) {
    if (settings[key]) {
      enabled.push(`✅ ${name}`);
    } else {
      disabled.push(`❌ ${name}`);
    }
  }

  const generalStatus = config.generalChannelId 
    ? `<#${config.generalChannelId}>` 
    : '`Not configured`';
  const appStatus = config.applicationChannelId 
    ? `<#${config.applicationChannelId}>` 
    : '`Not configured`';

  return new EmbedBuilder()
    .setTitle('📊 Current Configuration')
    .setDescription(
      '```\n' +
      '╔══════════════════════════════════════╗\n' +
      '║       CONFIGURATION OVERVIEW         ║\n' +
      '╚══════════════════════════════════════╝\n' +
      '```'
    )
    .setColor(0xA855F7)
    .addFields(
      {
        name: '📡 Channels',
        value: 
          `**General:** ${generalStatus}\n` +
          `**Applications:** ${appStatus}`,
        inline: false
      },
      {
        name: '🟢 Enabled Events',
        value: enabled.length > 0 ? enabled.join('\n') : '*None*',
        inline: true
      },
      {
        name: '🔴 Disabled Events',
        value: disabled.length > 0 ? disabled.join('\n') : '*None*',
        inline: true
      }
    )
    .setFooter({ text: '🔧 Use the main menu to make changes' })
    .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════
// MAIN MENU
// ═══════════════════════════════════════════════════════════════════

export async function showSettingsMenu(interaction) {
  try {
    const config = await getLoggingConfig(interaction.guildId);
    const embed = createMainMenuEmbed(config);

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`admin_settings_menu_${interaction.user.id}`)
      .setPlaceholder('📂 Select configuration category...')
      .addOptions([
        {
          label: 'Channel Setup',
          description: 'Configure log output channels',
          value: 'channels',
          emoji: '📡'
        },
        {
          label: 'Event Toggles',
          description: 'Enable/disable specific events',
          value: 'events',
          emoji: '🔔'
        },
        {
          label: 'View Configuration',
          description: 'See all current settings',
          value: 'view',
          emoji: '📊'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const payload = {
      embeds: [embed],
      components: [row]
    };

    // Handle different interaction types
    if (interaction.isChatInputCommand()) {
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    } else if (interaction.replied || interaction.deferred) {
      return interaction.editReply(payload);
    } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
      return interaction.update(payload);
    } else {
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error('[ADMIN-SETTINGS] showSettingsMenu error:', error);
    
    const errorPayload = {
      content: '❌ Failed to load settings. Please try again.',
      embeds: [],
      components: [],
      flags: MessageFlags.Ephemeral
    };
    
    try {
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply(errorPayload);
      } else {
        return interaction.reply(errorPayload);
      }
    } catch (e) {
      console.error('[ADMIN-SETTINGS] Error sending error message:', e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHANNELS MENU
// ═══════════════════════════════════════════════════════════════════

async function showChannelsMenu(interaction) {
  try {
    const config = await getLoggingConfig(interaction.guildId);
    const embed = createChannelsEmbed(config);

    const generalChannel = new ChannelSelectMenuBuilder()
      .setCustomId(`set_general_log_channel_${interaction.user.id}`)
      .setPlaceholder('📢 Select General Log Channel')
      .setChannelTypes(ChannelType.GuildText);

    const appChannel = new ChannelSelectMenuBuilder()
      .setCustomId(`set_application_log_channel_${interaction.user.id}`)
      .setPlaceholder('📋 Select Application Log Channel')
      .setChannelTypes(ChannelType.GuildText);

    const backButton = new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('Back to Main Menu')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const row1 = new ActionRowBuilder().addComponents(generalChannel);
    const row2 = new ActionRowBuilder().addComponents(appChannel);
    const row3 = new ActionRowBuilder().addComponents(backButton);

    return interaction.update({
      embeds: [embed],
      components: [row1, row2, row3]
    });
  } catch (error) {
    console.error('[ADMIN-SETTINGS] showChannelsMenu error:', error);
    return interaction.update({
      content: '❌ Failed to load channel settings.',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EVENTS MENU
// ═══════════════════════════════════════════════════════════════════

async function showEventsMenu(interaction) {
  try {
    const config = await getLoggingConfig(interaction.guildId);
    const embed = createEventsEmbed(config);

    const events = {
      'character_registration': { name: 'Character Registration', emoji: '📝' },
      'character_updates': { name: 'Character Updates', emoji: '✏️' },
      'character_deletion': { name: 'Character Deletion', emoji: '🗑️' },
      'verification': { name: 'User Verification', emoji: '✅' },
      'guild_applications': { name: 'Guild Applications', emoji: '📋' },
      'application_votes': { name: 'Vote Notifications', emoji: '🗳️' },
      'admin_overrides': { name: 'Admin Overrides', emoji: '⚠️' },
      'settings_changes': { name: 'Settings Changes', emoji: '⚙️' },
      'role_changes': { name: 'Role Changes', emoji: '🎭' }
    };

    const settings = config.settings || DEFAULT_SETTINGS;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`toggle_log_event_${interaction.user.id}`)
      .setPlaceholder('🔔 Select an event to toggle...')
      .addOptions(
        Object.entries(events).map(([key, info]) => ({
          label: info.name,
          value: key,
          description: settings[key] ? 'Currently: ON - Click to disable' : 'Currently: OFF - Click to enable',
          emoji: settings[key] ? '🟢' : '🔴'
        }))
      );

    const enableAllButton = new ButtonBuilder()
      .setCustomId(`admin_enable_all_${interaction.user.id}`)
      .setLabel('Enable All')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const disableAllButton = new ButtonBuilder()
      .setCustomId(`admin_disable_all_${interaction.user.id}`)
      .setLabel('Disable All')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    const backButton = new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const row1 = new ActionRowBuilder().addComponents(menu);
    const row2 = new ActionRowBuilder().addComponents(enableAllButton, disableAllButton, backButton);

    return interaction.update({
      embeds: [embed],
      components: [row1, row2]
    });
  } catch (error) {
    console.error('[ADMIN-SETTINGS] showEventsMenu error:', error);
    return interaction.update({
      content: '❌ Failed to load event settings.',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// VIEW SETTINGS
// ═══════════════════════════════════════════════════════════════════

async function showViewSettings(interaction) {
  try {
    const config = await getLoggingConfig(interaction.guildId);
    const embed = createViewEmbed(config);

    const backButton = new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('Back to Main Menu')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⬅️');

    const row = new ActionRowBuilder().addComponents(backButton);

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('[ADMIN-SETTINGS] showViewSettings error:', error);
    return interaction.update({
      content: '❌ Failed to load settings view.',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════

export async function handleSettingsMenuSelect(interaction) {
  const value = interaction.values[0];
  
  switch (value) {
    case 'channels':
      return showChannelsMenu(interaction);
    case 'events':
      return showEventsMenu(interaction);
    case 'view':
      return showViewSettings(interaction);
    default:
      return showSettingsMenu(interaction);
  }
}

export async function handleSettingsBackButton(interaction) {
  return showSettingsMenu(interaction);
}

export async function handleGeneralChannelSelect(interaction) {
  try {
    const channelId = interaction.values[0];
    const success = await setGeneralChannel(interaction.guildId, channelId);
    
    if (success) {
      console.log(`[ADMIN-SETTINGS] General log channel set to ${channelId}`);
      
      // Show success and refresh channel menu
      const config = await getLoggingConfig(interaction.guildId);
      const embed = createChannelsEmbed(config);
      
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **General log channel set to <#${channelId}>**`)
        .setColor(0x22C55E);

      const generalChannel = new ChannelSelectMenuBuilder()
        .setCustomId(`set_general_log_channel_${interaction.user.id}`)
        .setPlaceholder('📢 Select General Log Channel')
        .setChannelTypes(ChannelType.GuildText);

      const appChannel = new ChannelSelectMenuBuilder()
        .setCustomId(`set_application_log_channel_${interaction.user.id}`)
        .setPlaceholder('📋 Select Application Log Channel')
        .setChannelTypes(ChannelType.GuildText);

      const backButton = new ButtonBuilder()
        .setCustomId(`admin_settings_back_${interaction.user.id}`)
        .setLabel('Back to Main Menu')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');

      const row1 = new ActionRowBuilder().addComponents(generalChannel);
      const row2 = new ActionRowBuilder().addComponents(appChannel);
      const row3 = new ActionRowBuilder().addComponents(backButton);

      return interaction.update({
        embeds: [embed, successEmbed],
        components: [row1, row2, row3]
      });
    } else {
      return interaction.reply({
        content: '❌ Failed to set general log channel.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('[ADMIN-SETTINGS] handleGeneralChannelSelect error:', error);
    return interaction.reply({
      content: '❌ An error occurred. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleApplicationChannelSelect(interaction) {
  try {
    const channelId = interaction.values[0];
    const success = await setApplicationChannel(interaction.guildId, channelId);
    
    if (success) {
      console.log(`[ADMIN-SETTINGS] Application log channel set to ${channelId}`);
      
      // Show success and refresh channel menu
      const config = await getLoggingConfig(interaction.guildId);
      const embed = createChannelsEmbed(config);
      
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **Application log channel set to <#${channelId}>**`)
        .setColor(0x22C55E);

      const generalChannel = new ChannelSelectMenuBuilder()
        .setCustomId(`set_general_log_channel_${interaction.user.id}`)
        .setPlaceholder('📢 Select General Log Channel')
        .setChannelTypes(ChannelType.GuildText);

      const appChannel = new ChannelSelectMenuBuilder()
        .setCustomId(`set_application_log_channel_${interaction.user.id}`)
        .setPlaceholder('📋 Select Application Log Channel')
        .setChannelTypes(ChannelType.GuildText);

      const backButton = new ButtonBuilder()
        .setCustomId(`admin_settings_back_${interaction.user.id}`)
        .setLabel('Back to Main Menu')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');

      const row1 = new ActionRowBuilder().addComponents(generalChannel);
      const row2 = new ActionRowBuilder().addComponents(appChannel);
      const row3 = new ActionRowBuilder().addComponents(backButton);

      return interaction.update({
        embeds: [embed, successEmbed],
        components: [row1, row2, row3]
      });
    } else {
      return interaction.reply({
        content: '❌ Failed to set application log channel.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('[ADMIN-SETTINGS] handleApplicationChannelSelect error:', error);
    return interaction.reply({
      content: '❌ An error occurred. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleEventToggle(interaction) {
  try {
    const eventType = interaction.values[0];
    const result = await toggleEventSetting(interaction.guildId, eventType);
    
    if (result.success) {
      const status = result.enabled ? 'enabled' : 'disabled';
      console.log(`[ADMIN-SETTINGS] ${eventType} logging ${status}`);
      
      // Refresh the events menu
      return showEventsMenu(interaction);
    } else {
      return interaction.reply({
        content: '❌ Failed to toggle event. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('[ADMIN-SETTINGS] handleEventToggle error:', error);
    return interaction.reply({
      content: '❌ An error occurred. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleEnableAll(interaction) {
  try {
    const success = await setAllEvents(interaction.guildId, true);
    
    if (success) {
      console.log('[ADMIN-SETTINGS] All event logging enabled');
      return showEventsMenu(interaction);
    } else {
      return interaction.reply({
        content: '❌ Failed to enable all events.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('[ADMIN-SETTINGS] handleEnableAll error:', error);
    return interaction.reply({
      content: '❌ An error occurred.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleDisableAll(interaction) {
  try {
    const success = await setAllEvents(interaction.guildId, false);
    
    if (success) {
      console.log('[ADMIN-SETTINGS] All event logging disabled');
      return showEventsMenu(interaction);
    } else {
      return interaction.reply({
        content: '❌ Failed to disable all events.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('[ADMIN-SETTINGS] handleDisableAll error:', error);
    return interaction.reply({
      content: '❌ An error occurred.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY EXPORTS FOR COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════

export async function handleLoggingMenuSelect(interaction) {
  return handleSettingsMenuSelect(interaction);
}

export async function handleLoggingBackButton(interaction) {
  return showSettingsMenu(interaction);
}

// Placeholder exports for compatibility
export async function handleVerificationChannelSelect(interaction) {}
export async function handleLogChannelSelect(interaction) {}
export async function handleLogBatchSelect(interaction) {}
export async function handleLogCategoriesSelect(interaction) {}
export async function handleEphemeralSelect(interaction) {}
export async function handleLogSelect(interaction) {}
