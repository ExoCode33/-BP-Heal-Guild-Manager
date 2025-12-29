import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo, LogSettingsRepo, EphemeralRepo } from '../database/repositories.js';
import sheets from '../services/sheets.js';
import { syncAllNicknames } from '../services/nickname.js';
import { LOG_CATEGORIES, LOG_GROUPS, DEFAULT_ENABLED, BATCH_INTERVALS } from '../config/logCategories.js';
import { profileEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';
import config from '../config/index.js';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub.setName('sync').setDescription('Force sync to Google Sheets'))
  .addSubcommand(sub => sub.setName('nicknames').setDescription('Sync all member nicknames'))
  .addSubcommand(sub => sub.setName('logs').setDescription('Configure logging settings'))
  .addSubcommand(sub => sub.setName('ephemeral').setDescription('Configure ephemeral settings'))
  .addSubcommand(sub => sub.setName('stats').setDescription('View bot statistics'))
  .addSubcommand(sub => sub.setName('delete').setDescription('Delete a user\'s data').addUserOption(opt => opt.setName('user').setDescription('User to delete').setRequired(true)))
  .addSubcommand(sub => sub.setName('character').setDescription('View/edit another user\'s character').addUserOption(opt => opt.setName('user').setDescription('User to manage').setRequired(true)));

function embed(title, description) {
  return new EmbedBuilder().setColor('#EC4899').setDescription(`# ${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`).setTimestamp();
}

async function handleSync(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.deferReply({ ephemeral: isEph });
  const start = Date.now();
  const chars = await CharacterRepo.findAll();
  await sheets.sync(chars, interaction.client);
  await interaction.editReply({ embeds: [embed('✅ Sync Complete', `Synced **${chars.length}** characters.\n⏱️ Duration: **${Date.now() - start}ms**`)] });
}

async function handleNicknames(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.deferReply({ ephemeral: isEph });
  const chars = await CharacterRepo.findAll();
  const mains = chars.filter(c => c.character_type === 'main');
  const results = await syncAllNicknames(interaction.client, config.discord.guildId, mains);
  let desc = `**Updated:** ${results.success}\n**Failed:** ${results.failed}`;
  if (results.failures.length > 0) desc += `\n\n**Failures:**\n${results.failures.slice(0, 10).map(f => `• \`${f.ign}\`: ${f.reason}`).join('\n')}`;
  await interaction.editReply({ embeds: [embed(results.failed === 0 ? '✅ Success' : '⚠️ Completed', desc)] });
}

async function handleLogs(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
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
    new StringSelectMenuBuilder().setCustomId(`admin_logs_channel_${interaction.user.id}`).setPlaceholder('📺 Select log channel').addOptions([
      { label: 'Disable logging', value: 'none', description: 'Turn off Discord logging', emoji: '🔇' },
      ...interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).map(ch => ({ label: `#${ch.name}`, value: ch.id, description: ch.parent?.name || 'No category' })).slice(0, 24)
    ])
  ));
  rows.push(new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`admin_logs_batch_${interaction.user.id}`).setPlaceholder('⏱️ Select batch interval').addOptions(BATCH_INTERVALS.map(b => ({ label: b.label, value: b.value, default: String(batchInterval) === b.value })))
  ));
  rows.push(new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`admin_logs_categories_${interaction.user.id}`).setPlaceholder('📋 Select log categories').setMinValues(0).setMaxValues(Object.keys(LOG_CATEGORIES).length).addOptions(Object.entries(LOG_CATEGORIES).map(([key, cat]) => ({ label: cat.name, value: key, description: `[${cat.group}] ${cat.description.slice(0, 40)}`, emoji: cat.emoji, default: enabled.includes(key) })))
  ));

  await interaction.reply({ embeds: [embed('📋 Log Configuration', statusText)], components: rows, ephemeral: isEph });
}

async function handleEphemeral(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const current = await EphemeralRepo.get(interaction.guildId);
  const options = [
    { label: 'Character Commands', value: 'character', description: '/character responses', emoji: '👤' },
    { label: 'Admin Commands', value: 'admin', description: '/admin responses', emoji: '👑' }
  ].map(opt => ({ ...opt, default: current.includes(opt.value) }));
  const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`admin_ephemeral_${interaction.user.id}`).setPlaceholder('Select ephemeral responses').setMinValues(0).setMaxValues(options.length).addOptions(options));
  const currentList = current.length > 0 ? current.map(c => c === 'character' ? '👤 Character' : '👑 Admin').join(', ') : '*None*';
  await interaction.reply({ embeds: [embed('👁️ Ephemeral Settings', `**Currently Private:** ${currentList}\n\n✅ Selected = Private\n❌ Not Selected = Public`)], components: [row], ephemeral: isEph });
}

async function handleStats(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const chars = await CharacterRepo.findAll();
  const users = new Set(chars.map(c => c.user_id)).size;
  const mains = chars.filter(c => c.character_type === 'main').length;
  const subs = chars.filter(c => c.character_type === 'main_subclass').length;
  const classes = {};
  chars.filter(c => c.character_type === 'main').forEach(c => { classes[c.class] = (classes[c.class] || 0) + 1; });
  const topClasses = Object.entries(classes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `• ${name}: **${count}**`).join('\n') || '*No data*';
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const e = new EmbedBuilder().setColor('#EC4899').setTitle('📊 Bot Statistics').addFields(
    { name: '👥 Characters', value: `Users: **${users}**\nMain: **${mains}**\nSubclasses: **${subs}**`, inline: true },
    { name: '🏆 Top Classes', value: topClasses, inline: true },
    { name: '💻 System', value: `Memory: **${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB**\nUptime: **${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m**\nNode: **${process.version}**`, inline: false }
  ).setTimestamp();
  await interaction.reply({ embeds: [e], ephemeral: isEph });
}

async function handleDelete(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const target = interaction.options.getUser('user');
  const chars = await CharacterRepo.findAllByUser(target.id);
  if (chars.length === 0) return interaction.reply({ embeds: [embed('❌ No Data', `**${target.username}** has no characters.`)], ephemeral: isEph });
  await CharacterRepo.deleteAllByUser(target.id);
  logger.delete(interaction.user.username, 'admin', `All data for ${target.username}`);
  await interaction.reply({ embeds: [embed('✅ Deleted', `Removed **${chars.length}** character(s) for **${target.username}**.`)], ephemeral: isEph });
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

async function handleCharacter(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const target = interaction.options.getUser('user');
  const chars = await CharacterRepo.findAllByUser(target.id);
  const main = chars.find(c => c.character_type === 'main');
  if (!main && chars.length === 0) return interaction.reply({ embeds: [embed('❌ No Character', `**${target.username}** hasn't registered.`)], ephemeral: isEph });
  const profileEmb = await profileEmbed(target, chars, interaction);
  await interaction.reply({ embeds: [profileEmb], components: ui.adminProfileButtons(target.id, !!main), ephemeral: isEph });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  logger.command('admin', interaction.user.username, sub);
  try {
    switch (sub) {
      case 'sync': return await handleSync(interaction);
      case 'nicknames': return await handleNicknames(interaction);
      case 'logs': return await handleLogs(interaction);
      case 'ephemeral': return await handleEphemeral(interaction);
      case 'stats': return await handleStats(interaction);
      case 'delete': return await handleDelete(interaction);
      case 'character': return await handleCharacter(interaction);
    }
  } catch (e) {
    logger.error('Admin', `${sub} failed`, e);
    const isEph = await isEphemeral(interaction.guildId, 'admin');
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Command failed.', ephemeral: isEph });
  }
}

export async function handleLogChannelSelect(interaction) {
  const channelId = interaction.values[0];
  await LogSettingsRepo.upsert(interaction.guildId, { channelId: channelId === 'none' ? null : channelId });
  await logger.reloadSettings();
  await interaction.reply({ embeds: [embed('✅ Channel Updated', channelId === 'none' ? '**Log Channel:** Disabled' : `**Log Channel:** <#${channelId}>`)], ephemeral: true });
}

export async function handleLogBatchSelect(interaction) {
  const interval = parseInt(interaction.values[0]);
  await LogSettingsRepo.upsert(interaction.guildId, { batchInterval: interval });
  await logger.reloadSettings();
  const label = BATCH_INTERVALS.find(b => b.value === String(interval))?.label || 'Unknown';
  await interaction.reply({ embeds: [embed('✅ Batch Mode Updated', `**Batch Interval:** ${label}`)], ephemeral: true });
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
  await interaction.reply({ embeds: [embed('✅ Categories Updated', `${statusText}\n**Total:** ${selected.length}/${Object.keys(LOG_CATEGORIES).length}`)], ephemeral: true });
}

export async function handleLogSelect(interaction) { return handleLogCategoriesSelect(interaction); }

export async function handleEphemeralSelect(interaction) {
  const selected = interaction.values;
  await EphemeralRepo.set(interaction.guildId, selected);
  const currentList = selected.length > 0 ? selected.map(c => c === 'character' ? '👤 Character' : '👑 Admin').join(', ') : '*None (all public)*';
  await interaction.update({ embeds: [embed('✅ Saved', `**Private:** ${currentList}`)], components: [] });
}
