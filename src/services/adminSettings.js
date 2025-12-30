import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } from 'discord.js';
import { isEphemeral } from './ephemeral.js';
import { LogSettingsRepo, EphemeralRepo } from '../database/repositories.js';
import { VerificationSystem } from './verification.js';
import { LOG_CATEGORIES, LOG_GROUPS, DEFAULT_ENABLED, BATCH_INTERVALS } from '../config/logCategories.js';
import logger from './logger.js';

function embed(title, description) {
  return new EmbedBuilder().setColor('#EC4899').setDescription(`# ${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`).setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SETTINGS MENU
// ═══════════════════════════════════════════════════════════════════

export async function showSettingsMenu(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  
  const description = 
    '**Choose a category to configure:**\n\n' +
    '🔔 **Logging** - Discord logging configuration\n' +
    '👁 **Ephemeral** - Privacy settings for responses\n' +
    '✅ **Verification** - Registration channel status';

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_settings_menu_${interaction.user.id}`)
      .setPlaceholder('Select a settings category')
      .addOptions([
        {
          label: 'Logging Settings',
          value: 'logs',
          description: 'Configure Discord logging',
          emoji: '🔔'
        },
        {
          label: 'Ephemeral Settings',
          value: 'ephemeral',
          description: 'Configure message privacy',
          emoji: '👁'
        },
        {
          label: 'Verification Status',
          value: 'verification',
          description: 'View registration channel',
          emoji: '✅'
        }
      ])
  );

  await interaction.reply({ 
    embeds: [embed('⚙️ Admin Settings', description)], 
    components: [row], 
    flags: isEph ? MessageFlags.Ephemeral : undefined
  });
}

// ═══════════════════════════════════════════════════════════════════
// VERIFICATION STATUS
// ═══════════════════════════════════════════════════════════════════

export async function showVerificationStatus(interaction) {
  const channelId = await VerificationSystem.getVerificationChannelId(interaction.guildId);
  
  let statusText = '';
  
  if (channelId) {
    statusText += `**📺 Verification Channel:** <#${channelId}>\n`;
    statusText += `**Status:** ✅ Configured\n\n`;
    statusText += '**How it works:**\n';
    statusText += '1. Bot posts persistent registration embed in this channel\n';
    statusText += '2. Users click button to register (ephemeral registration flow)\n';
    statusText += '3. After approval, users get Verified + Guild + Class roles\n';
    statusText += '4. Users gain full server access\n\n';
    statusText += '**To change:** Use the dropdown below to select a new channel.';
  } else {
    statusText += `**📺 Verification Channel:** ❌ Not configured\n\n`;
    statusText += '**Setup:**\n';
    statusText += '1. Select a channel from the dropdown below\n';
    statusText += '2. Bot will automatically post the registration embed\n';
    statusText += '3. Users can then click the button to register\n\n';
    statusText += '**Note:** The channel will be saved to the database.';
  }

  const rows = [];
  
  // Get text channels for selection
  const textChannels = interaction.guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText)
    .map(ch => ({ 
      label: `#${ch.name}`.substring(0, 100), 
      value: ch.id, 
      description: (ch.parent?.name || 'No category').substring(0, 100),
      emoji: '📺'
    }))
    .slice(0, 24);

  rows.push(new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_verification_channel_${interaction.user.id}`)
      .setPlaceholder('📺 Select verification channel')
      .addOptions([
        { 
          label: 'Disable verification system', 
          value: 'none', 
          description: 'Remove verification embed', 
          emoji: '🔇' 
        },
        ...textChannels
      ])
  ));

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('← Back to Settings')
      .setStyle(ButtonStyle.Secondary)
  ));

  await interaction.update({ 
    embeds: [embed('✅ Verification Settings', statusText)], 
    components: rows 
  });
}

// ═══════════════════════════════════════════════════════════════════
// LOGGING SETTINGS
// ═══════════════════════════════════════════════════════════════════

export async function showLoggingSettings(interaction) {
  try {
    const current = await LogSettingsRepo.get(interaction.guildId);
    const enabled = current?.enabled_categories || DEFAULT_ENABLED;
    const channelId = current?.log_channel_id;
    const batchInterval = current?.batch_interval || 0;

    let statusText = channelId 
      ? `**📺 Log Channel:** <#${channelId}>\n` 
      : `**📺 Log Channel:** ❌ *Not configured*\n`;
    
    const batchLabel = BATCH_INTERVALS.find(b => b.value === String(batchInterval))?.label || 'Instant';
    statusText += `**⏱️ Batch Mode:** ${batchLabel}\n\n`;
    
    statusText += '**Category Status:**\n';
    for (const [group, categories] of Object.entries(LOG_GROUPS)) {
      const groupEnabled = categories.filter(c => enabled.includes(c));
      const icon = groupEnabled.length === categories.length ? '✅' : groupEnabled.length > 0 ? '🔶' : '❌';
      statusText += `${icon} **${group}:** ${groupEnabled.length}/${categories.length}\n`;
    }

    const rows = [];
    
    // Get text channels for selection
    const textChannels = interaction.guild.channels.cache
      .filter(ch => ch.type === ChannelType.GuildText)
      .map(ch => ({ 
        label: `#${ch.name}`.substring(0, 100), 
        value: ch.id, 
        description: (ch.parent?.name || 'No category').substring(0, 100)
      }))
      .slice(0, 24);

    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`admin_logs_channel_${interaction.user.id}`)
        .setPlaceholder('📺 Select log channel')
        .addOptions([
          { label: 'Disable logging', value: 'none', description: 'Turn off Discord logging', emoji: '🔇' },
          ...textChannels
        ])
    ));
    
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`admin_logs_batch_${interaction.user.id}`)
        .setPlaceholder('⏱️ Select batch interval')
        .addOptions(BATCH_INTERVALS.map(b => ({ 
          label: b.label, 
          value: b.value, 
          default: String(batchInterval) === b.value 
        })))
    ));
    
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`admin_logs_categories_${interaction.user.id}`)
        .setPlaceholder('📋 Select log categories')
        .setMinValues(0)
        .setMaxValues(Object.keys(LOG_CATEGORIES).length)
        .addOptions(Object.entries(LOG_CATEGORIES).map(([key, cat]) => ({ 
          label: cat.name, 
          value: key, 
          description: `[${cat.group}] ${cat.description.slice(0, 40)}`, 
          emoji: cat.emoji, 
          default: enabled.includes(key) 
        })))
    ));

    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_settings_back_${interaction.user.id}`)
        .setLabel('← Back to Settings')
        .setStyle(ButtonStyle.Secondary)
    ));

    await interaction.update({ 
      embeds: [embed('🔔 Logging Settings', statusText)], 
      components: rows 
    });
  } catch (error) {
    console.error('[ADMIN] Error showing logging settings:', error);
    await interaction.update({ 
      embeds: [embed('❌ Error', `Failed to load settings: ${error.message}`)], 
      components: [] 
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EPHEMERAL SETTINGS
// ═══════════════════════════════════════════════════════════════════

export async function showEphemeralSettings(interaction) {
  try {
    const current = await EphemeralRepo.get(interaction.guildId);
    
    const options = [
      { label: '/edit-character', value: 'edit_character', description: '💬 COMMAND - Manage your profile', emoji: '✏️' },
      { label: '/view-character', value: 'view_character', description: '💬 COMMAND - View character profiles', emoji: '👁' },
      { label: '/admin', value: 'admin', description: '💬 COMMAND - Admin responses', emoji: '⚙️' },
      { label: 'Registration', value: 'registration', description: '🔄 FLOW - New character registration', emoji: '📝' },
      { label: 'Edit Actions', value: 'edit_actions', description: '🔄 FLOW - Editing character info', emoji: '🔧' },
      { label: 'Add Character', value: 'add_character', description: '🔄 FLOW - Adding subclasses', emoji: '➕' },
      { label: 'Delete Character', value: 'delete_character', description: '🔄 FLOW - Character deletion', emoji: '🗑️' },
      { label: 'Error Messages', value: 'errors', description: '💬 MESSAGE - Error/validation messages', emoji: '❌' }
    ].map(opt => ({ 
      ...opt, 
      default: current.includes(opt.value) 
    }));
    
    const categoryNames = {
      'edit_character': '✏️ /edit-character',
      'view_character': '👁 /view-character',
      'admin': '⚙️ /admin',
      'registration': '📝 Registration',
      'edit_actions': '🔧 Edit Actions',
      'add_character': '➕ Add Character',
      'delete_character': '🗑️ Delete Character',
      'errors': '❌ Errors'
    };
    
    const currentList = current.length > 0 
      ? current.map(c => categoryNames[c] || c).join('\n') 
      : '*None (all public)*';
    
    const description = 
      `**Currently Private:**\n${currentList}\n\n` +
      '✅ Selected = Private (only you see)\n' +
      '❌ Not Selected = Public (everyone sees)\n\n' +
      '**💡 Recommended Settings:**\n' +
      '• ✏️ /edit-character - Private ✅\n' +
      '• 👁 /view-character - Public ❌\n' +
      '• 📝 Registration - Private ✅\n' +
      '• 🔧 Edit Actions - Private ✅\n' +
      '• ❌ Errors - Private ✅';
    
    const rows = [];
    
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`admin_ephemeral_${interaction.user.id}`)
        .setPlaceholder('Select ephemeral responses (private messages)')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options)
    ));

    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_settings_back_${interaction.user.id}`)
        .setLabel('← Back to Settings')
        .setStyle(ButtonStyle.Secondary)
    ));
    
    await interaction.update({ 
      embeds: [embed('👁 Ephemeral Settings', description)], 
      components: rows 
    });
  } catch (error) {
    console.error('[ADMIN] Error showing ephemeral settings:', error);
    await interaction.update({ 
      embeds: [embed('❌ Error', `Failed to load settings: ${error.message}`)], 
      components: [] 
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// SELECT MENU HANDLERS
// ═══════════════════════════════════════════════════════════════════

export async function handleSettingsMenuSelect(interaction) {
  const selected = interaction.values[0];
  
  switch (selected) {
    case 'logs': return await showLoggingSettings(interaction);
    case 'ephemeral': return await showEphemeralSettings(interaction);
    case 'verification': return await showVerificationStatus(interaction);
  }
}

export async function handleSettingsBackButton(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  
  const description = 
    '**Choose a category to configure:**\n\n' +
    '🔔 **Logging** - Discord logging configuration\n' +
    '👁 **Ephemeral** - Privacy settings for responses\n' +
    '✅ **Verification** - Registration channel status';

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_settings_menu_${interaction.user.id}`)
      .setPlaceholder('Select a settings category')
      .addOptions([
        {
          label: 'Logging Settings',
          value: 'logs',
          description: 'Configure Discord logging',
          emoji: '🔔'
        },
        {
          label: 'Ephemeral Settings',
          value: 'ephemeral',
          description: 'Configure message privacy',
          emoji: '👁'
        },
        {
          label: 'Verification Status',
          value: 'verification',
          description: 'View registration channel',
          emoji: '✅'
        }
      ])
  );

  await interaction.update({ 
    embeds: [embed('⚙️ Admin Settings', description)], 
    components: [row]
  });
}

export async function handleVerificationChannelSelect(interaction) {
  const channelId = interaction.values[0];
  
  try {
    if (channelId === 'none') {
      await VerificationSystem.setVerificationChannelId(interaction.guildId, null);
      await interaction.reply({ 
        embeds: [embed('✅ Verification Disabled', 'The verification system has been disabled.')], 
        flags: MessageFlags.Ephemeral
      });
    } else {
      await VerificationSystem.setVerificationChannelId(interaction.guildId, channelId);
      await VerificationSystem.setupVerificationChannel(interaction.client, interaction.guildId);
      
      await interaction.reply({ 
        embeds: [embed('✅ Verification Enabled', `**Verification Channel:** <#${channelId}>\n\nThe registration embed has been posted!`)], 
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('[ADMIN] Error setting verification channel:', error);
    await interaction.reply({ 
      embeds: [embed('❌ Error', `Failed to update verification channel: ${error.message}`)], 
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleLogChannelSelect(interaction) {
  const channelId = interaction.values[0];
  
  try {
    await LogSettingsRepo.upsert(interaction.guildId, { 
      channelId: channelId === 'none' ? null : channelId 
    });
    
    // Reload logger settings to pick up the new channel
    console.log('[ADMIN] Reloading logger settings...');
    await logger.reloadSettings();
    
    await interaction.reply({ 
      embeds: [embed('✅ Channel Updated', 
        channelId === 'none' 
          ? '**Log Channel:** Disabled\n\nDiscord logging has been turned off.' 
          : `**Log Channel:** <#${channelId}>\n\nLogs will now be sent to this channel.`
      )], 
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('[ADMIN] Error setting log channel:', error);
    await interaction.reply({ 
      embeds: [embed('❌ Error', `Failed to update log channel: ${error.message}`)], 
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleLogBatchSelect(interaction) {
  const interval = parseInt(interaction.values[0]);
  
  try {
    await LogSettingsRepo.upsert(interaction.guildId, { batchInterval: interval });
    
    // Reload logger settings
    console.log('[ADMIN] Reloading logger settings...');
    await logger.reloadSettings();
    
    const label = BATCH_INTERVALS.find(b => b.value === String(interval))?.label || 'Unknown';
    await interaction.reply({ 
      embeds: [embed('✅ Batch Mode Updated', `**Batch Interval:** ${label}\n\n${
        interval === 0 
          ? 'Logs will be sent immediately as events occur.' 
          : `Logs will be batched and sent every ${interval} minute(s).`
      }`)], 
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('[ADMIN] Error setting batch interval:', error);
    await interaction.reply({ 
      embeds: [embed('❌ Error', `Failed to update batch interval: ${error.message}`)], 
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleLogCategoriesSelect(interaction) {
  const selected = interaction.values;
  
  try {
    await LogSettingsRepo.upsert(interaction.guildId, { enabledCategories: selected });
    
    // Reload logger settings
    console.log('[ADMIN] Reloading logger settings...');
    await logger.reloadSettings();
    
    let statusText = '**Updated Category Status:**\n\n';
    for (const [group, categories] of Object.entries(LOG_GROUPS)) {
      const groupEnabled = categories.filter(c => selected.includes(c));
      const icon = groupEnabled.length === categories.length ? '✅' : groupEnabled.length > 0 ? '🔶' : '❌';
      statusText += `${icon} **${group}:** ${groupEnabled.length}/${categories.length}\n`;
    }
    statusText += `\n**Total:** ${selected.length}/${Object.keys(LOG_CATEGORIES).length} categories enabled`;
    
    await interaction.reply({ 
      embeds: [embed('✅ Categories Updated', statusText)], 
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('[ADMIN] Error setting log categories:', error);
    await interaction.reply({ 
      embeds: [embed('❌ Error', `Failed to update categories: ${error.message}`)], 
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleEphemeralSelect(interaction) {
  const selected = interaction.values;
  
  try {
    await EphemeralRepo.set(interaction.guildId, selected);
    
    const categoryNames = {
      'edit_character': '✏️ /edit-character',
      'view_character': '👁 /view-character',
      'admin': '⚙️ /admin',
      'registration': '📝 Registration',
      'edit_actions': '🔧 Edit Actions',
      'add_character': '➕ Add Character',
      'delete_character': '🗑️ Delete Character',
      'errors': '❌ Errors'
    };
    
    const currentList = selected.length > 0 
      ? selected.map(c => categoryNames[c] || c).join('\n') 
      : '*None (all public)*';
    
    await interaction.update({ 
      embeds: [embed('✅ Saved', `**Private Responses:**\n${currentList}`)], 
      components: [] 
    });
  } catch (error) {
    console.error('[ADMIN] Error setting ephemeral settings:', error);
    await interaction.reply({ 
      embeds: [embed('❌ Error', `Failed to update settings: ${error.message}`)], 
      flags: MessageFlags.Ephemeral
    });
  }
}
