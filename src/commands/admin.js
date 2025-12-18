import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import config from '../config/index.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { LogSettingsRepo, EphemeralRepo } from '../database/repositories.js';
import sheets from '../services/sheets.js';
import { syncAllNicknames } from '../services/nickname.js';
import { LOG_CATEGORIES } from '../config/logCategories.js';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub.setName('sync').setDescription('Force sync to Google Sheets'))
  .addSubcommand(sub => sub.setName('nicknames').setDescription('Sync all member nicknames'))
  .addSubcommand(sub => sub.setName('logs').setDescription('Configure log categories'))
  .addSubcommand(sub => sub.setName('ephemeral').setDescription('Configure ephemeral settings'))
  .addSubcommand(sub => sub.setName('stats').setDescription('View bot statistics'))
  .addSubcommand(sub => sub
    .setName('delete')
    .setDescription('Delete a user\'s data')
    .addUserOption(opt => opt.setName('user').setDescription('User to delete').setRequired(true)));

function embed(title, description) {
  return new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`# ${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`)
    .setTimestamp();
}

async function handleSync(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.deferReply({ ephemeral: isEph });

  const chars = await CharacterRepo.findAll();
  await sheets.sync(chars, interaction.client);

  const e = embed('✅ Sync Complete', `Synced **${chars.length}** characters to Google Sheets.`);
  await interaction.editReply({ embeds: [e] });
}

async function handleNicknames(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.deferReply({ ephemeral: isEph });

  const chars = await CharacterRepo.findAll();
  const mains = chars.filter(c => c.character_type === 'main');

  const results = await syncAllNicknames(interaction.client, config.discord.guildId, mains);

  let desc = `Updated: ${results.success}, Failed: ${results.failed}`;
  if (results.failures.length > 0) {
    desc += `\n\n**Failures:**\n${results.failures.map(f => `• ${f.ign}: ${f.reason}`).join('\n')}`;
  }

  const e = embed('✅ Success', desc);
  await interaction.editReply({ embeds: [e] });
}

async function handleLogs(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const current = await LogSettingsRepo.get(interaction.guildId);
  const enabled = current?.enabled_categories || Object.keys(LOG_CATEGORIES);

  const options = Object.entries(LOG_CATEGORIES).map(([key, cat]) => ({
    label: cat.name,
    value: key,
    description: cat.description.slice(0, 100),
    emoji: cat.emoji,
    default: enabled.includes(key)
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_logs_${interaction.user.id}`)
      .setPlaceholder('Select log categories')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options)
  );

  const e = embed('📋 Log Settings', `**Currently enabled:** ${enabled.length} categories\n\nSelect which events to log:`);
  await interaction.reply({ embeds: [e], components: [row], ephemeral: isEph });
}

async function handleEphemeral(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const current = await EphemeralRepo.get(interaction.guildId);

  const options = [
    { label: 'Register Character', value: 'register', description: 'Registration flow responses' },
    { label: 'Edit Character', value: 'edit', description: 'Edit flow responses' },
    { label: 'View Profile', value: 'view', description: 'Profile view responses' },
    { label: 'Admin Commands', value: 'admin', description: 'Admin command responses' },
    { label: 'Member List', value: 'list', description: '/character list responses' }
  ].map(opt => ({ ...opt, default: current.includes(opt.value) }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_ephemeral_${interaction.user.id}`)
      .setPlaceholder('Select ephemeral responses')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options)
  );

  const e = embed('👁️ Ephemeral Settings', `**Currently private:** ${current.length > 0 ? current.join(', ') : 'None'}\n\nSelect which responses should be ephemeral (only visible to the user):`);
  await interaction.reply({ embeds: [e], components: [row], ephemeral: isEph });
}

async function handleStats(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const chars = await CharacterRepo.findAll();

  const users = new Set(chars.map(c => c.user_id)).size;
  const mains = chars.filter(c => c.character_type === 'main').length;
  const alts = chars.filter(c => c.character_type === 'alt').length;
  const subs = chars.filter(c => c.character_type.includes('subclass')).length;

  const classes = {};
  chars.filter(c => c.character_type === 'main').forEach(c => {
    classes[c.class] = (classes[c.class] || 0) + 1;
  });

  const topClasses = Object.entries(classes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `• ${name}: ${count}`)
    .join('\n');

  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const mins = Math.floor((uptime % 3600) / 60);

  const desc = `**📊 Character Stats**
- Total Users: ${users}
- Main Characters: ${mains}
- Alt Characters: ${alts}
- Subclasses: ${subs}

**🏆 Top Classes**
${topClasses || 'No data'}

**💻 System**
- Memory: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB
- Uptime: ${days}d ${hours}h ${mins}m`;

  const e = embed('Bot Statistics', desc);
  await interaction.reply({ embeds: [e], ephemeral: isEph });
}

async function handleDelete(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const target = interaction.options.getUser('user');

  await CharacterRepo.deleteAllByUser(target.id);
  logger.delete(interaction.user.username, 'admin', `All data for ${target.username}`);

  const e = embed('✅ Deleted', `Removed all character data for **${target.username}**.`);
  await interaction.reply({ embeds: [e], ephemeral: isEph });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  logger.command('admin', interaction.user.username, sub);

  try {
    if (sub === 'sync') return await handleSync(interaction);
    if (sub === 'nicknames') return await handleNicknames(interaction);
    if (sub === 'logs') return await handleLogs(interaction);
    if (sub === 'ephemeral') return await handleEphemeral(interaction);
    if (sub === 'stats') return await handleStats(interaction);
    if (sub === 'delete') return await handleDelete(interaction);
  } catch (e) {
    logger.error('Admin', `${sub} failed`, e);
    const isEph = await isEphemeral(interaction.guildId, 'admin');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Command failed.', ephemeral: isEph });
    }
  }
}

export async function handleLogSelect(interaction) {
  const selected = interaction.values;
  await LogSettingsRepo.upsert(interaction.guildId, { enabledCategories: selected });
  await logger.init(interaction.client);

  const e = embed('✅ Saved', `Now logging **${selected.length}** categories.`);
  await interaction.update({ embeds: [e], components: [] });
}

export async function handleEphemeralSelect(interaction) {
  const selected = interaction.values;
  await EphemeralRepo.set(interaction.guildId, selected);

  const e = embed('✅ Saved', `**Private responses:** ${selected.length > 0 ? selected.join(', ') : 'None'}`);
  await interaction.update({ embeds: [e], components: [] });
}
