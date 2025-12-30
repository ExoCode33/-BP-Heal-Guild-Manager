import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
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
    ephemeral: isEph 
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
        ...interaction.guild.channels.cache
          .filter(ch => ch.type === ChannelType.GuildText)
          .map(ch => ({ 
            label: `#${ch.name}`, 
            value: ch.id, 
            description: ch.parent?.name || 'No category',
            emoji: '📺'
          }))
          .slice(0, 24)
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
  const current = await LogSettingsRepo.get(interaction.guildId);
  const enabled = current?.enabled_categories || DEFAULT_ENABLED;
  const channelId = current?.log_channel_id;
  const batchInterval = current?.batch_interval || 0;

  let statusText = channelId ? `**📺 Log Channel:** <#${channelId}>\n` : `**📺 Log Channel:** *Not configured*\n`;
  const batchLabel = BATCH_INTERVALS.find(b => b.value === String(batchInterval))?.label || 'Instant';
  statusText += `**⏱️ Batch Mode:** ${batchLabel}\n\n`;
  
  for (const [group, categories] of Object.entries(LOG_GROUPS)) {
    const groupEnabled = categories.filter(c => enabled.includes(c));
    const icon = groupEnabled.length === categories.length ? '✅' : groupEnabled.length > 0 ? '🔶' : '❌';
    statusText += `${icon} **${group}:** ${groupEnabled.length}/${categories.length}\n`;
  }

  const rows = [];
  
  rows.push(new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_logs_channel_${interaction.user.id}`)
      .setPlaceholder('📺 Select log channel')
      .addOptions([
        { label: 'Disable logging', value: 'none', description: 'Turn off Discord logging', emoji: '🔇' },
        ...interaction.guild.channels.cache
          .filter(ch => ch.type === ChannelType.GuildText)
          .map(ch => ({ label: `#${ch.name}`, value: ch.id, description: ch.parent?.name || 'No category' }))
          .slice(0, 24)
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
}

// ═══════════════════════════════════════════════════════════════════
// EPHEMERAL SETTINGS
// ═══════════════════════════════════════════════════════════════════

export async function showEphemeralSettings(interaction) {
  const current = await EphemeralRepo.get(interaction.guildId);
  
  const options = [
    { label: '💬 COMMANDS', value: 'header_commands', description: '────────────────────', emoji: '─', default: false },
    { label: '/edit-character', value: 'edit_character', description: 'Manage your profile with buttons', emoji: '✏️' },
    { label: '/view-character', value: 'view_character', description: 'View character profiles', emoji: '👁' },
    { label: '/admin', value: 'admin', description: 'Admin command responses', emoji: '⚙️' },
    
    { label: '🔄 FLOWS', value: 'header_flows', description: '────────────────────', emoji: '─', default: false },
    { label: 'Registration', value: 'registration', description: 'New character registration', emoji: '📝' },
    { label: 'Edit Actions', value: 'edit_actions', description: 'Editing character info', emoji: '🔧' },
    { label: 'Add Character', value: 'add_character', description: 'Adding subclasses', emoji: '➕' },
    { label: 'Delete Character', value: 'delete_character', description: 'Character deletion', emoji: '🗑️' },
    
    { label: '💬 MESSAGES', value: 'header_messages', description: '────────────────────', emoji: '─', default: false },
    { label: 'Error Messages', value: 'errors', description: 'Error/validation messages', emoji: '❌' }
  ].map(opt => ({ 
    ...opt, 
    default: opt.value.startsWith('header_') ? false : current.includes(opt.value) 
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
  await showSettingsMenu(interaction);
}

export async function handleVerificationChannelSelect(interaction) {
  const channelId = interaction.values[0];
  
  if (channelId === 'none') {
    await VerificationSystem.setVerificationChannelId(interaction.guildId, null);
    await interaction.reply({ 
      embeds: [embed('✅ Verification Disabled', 'The verification system has been disabled.')], 
      ephemeral: true 
    });
  } else {
    await VerificationSystem.setVerificationChannelId(interaction.guildId, channelId);
    await VerificationSystem.setupVerificationChannel(interaction.client, interaction.guildId);
    
    await interaction.reply({ 
      embeds: [embed('✅ Verification Enabled', `**Verification Channel:** <#${channelId}>\n\nThe registration embed has been posted!`)], 
      ephemeral: true 
    });
  }
}

export async function handleLogChannelSelect(interaction) {
  const channelId = interaction.values[0];
  await LogSettingsRepo.upsert(interaction.guildId, { 
    channelId: channelId === 'none' ? null : channelId 
  });
  await logger.reloadSettings();
  await interaction.reply({ 
    embeds: [embed('✅ Channel Updated', channelId === 'none' ? '**Log Channel:** Disabled' : `**Log Channel:** <#${channelId}>`)], 
    ephemeral: true 
  });
}

export async function handleLogBatchSelect(interaction) {
  const interval = parseInt(interaction.values[0]);
  await LogSettingsRepo.upsert(interaction.guildId, { batchInterval: interval });
  await logger.reloadSettings();
  const label = BATCH_INTERVALS.find(b => b.value === String(interval))?.label || 'Unknown';
  await interaction.reply({ 
    embeds: [embed('✅ Batch Mode Updated', `**Batch Interval:** ${label}`)], 
    ephemeral: true 
  });
}

export async function handleLogCategoriesSelect(interaction) {
  const selected = interaction.values;
  await LogSettingsRepo.upsert(interaction.guildId, { enabledCategories: selected });
  await logger.reloadSettings();
  
  let statusText = '';
  for (const [group, categories] of Object.entries(LOG_GROUPS)) {
    const groupEnabled = categories.filter(c => selected.includes(c));
    const icon = groupEnabled.length === categories.length ? '✅' : groupEnabled.length > 0 ? '🔶' : '❌';
    statusText += `${icon} **${group}:** ${groupEnabled.length}/${categories.length}\n`;
  }
  
  await interaction.reply({ 
    embeds: [embed('✅ Categories Updated', `${statusText}\n**Total:** ${selected.length}/${Object.keys(LOG_CATEGORIES).length}`)], 
    ephemeral: true 
  });
}

export async function handleEphemeralSelect(interaction) {
  const selected = interaction.values.filter(v => !v.startsWith('header_'));
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
    embeds: [embed('✅ Saved', `**Private:**\n${currentList}`)], 
    components: [] 
  });
}
