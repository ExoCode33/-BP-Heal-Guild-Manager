import { EmbedBuilder } from 'discord.js';
import pool from '../database/index.js';

const PINK = 0xEC4899;

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

const APPLICATION_EVENTS = [
  'guild_applications',
  'application_votes',
  'admin_overrides'
];

class DiscordLogger {
  constructor() {
    this.client = null;
  }

  init(client) {
    this.client = client;
    console.log('[DISCORD-LOGGER] Initialized');
  }

  async getConfig(guildId) {
    try {
      const result = await pool.query(
        'SELECT general_log_channel_id, application_log_channel_id, log_settings FROM guild_settings WHERE guild_id = $1',
        [guildId]
      );
      
      if (result.rows.length === 0) {
        return { generalChannelId: null, applicationChannelId: null, settings: DEFAULT_SETTINGS };
      }
      
      const row = result.rows[0];
      return {
        generalChannelId: row.general_log_channel_id,
        applicationChannelId: row.application_log_channel_id,
        settings: row.log_settings || DEFAULT_SETTINGS
      };
    } catch (error) {
      console.error('[DISCORD-LOGGER] getConfig error:', error.message);
      return { generalChannelId: null, applicationChannelId: null, settings: DEFAULT_SETTINGS };
    }
  }

  async log(guildId, eventType, embed) {
    if (!this.client) {
      console.error('[DISCORD-LOGGER] Client not initialized');
      return;
    }

    try {
      const config = await this.getConfig(guildId);
      
      if (!config.settings[eventType]) {
        return;
      }

      const isApplicationEvent = APPLICATION_EVENTS.includes(eventType);
      const channelId = isApplicationEvent ? config.applicationChannelId : config.generalChannelId;

      if (!channelId) {
        return;
      }

      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        console.error(`[DISCORD-LOGGER] Channel ${channelId} not found`);
        return;
      }

      if (embed instanceof EmbedBuilder) {
        embed.setColor(PINK);
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[DISCORD-LOGGER] log error:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CHARACTER EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async logCharacterRegistration(guildId, user, character, type = 'main') {
    const typeLabel = type === 'main' ? '📝 New Main Character' : '📝 New Subclass';
    
    const embed = new EmbedBuilder()
      .setTitle(typeLabel)
      .setDescription(`<@${user.id}> registered a new ${type} character`)
      .addFields(
        { name: '👤 User', value: user.username, inline: true },
        { name: '🎮 IGN', value: character.ign || 'N/A', inline: true },
        { name: '🆔 UID', value: character.uid || 'N/A', inline: true },
        { name: '🎭 Class', value: `${character.className} - ${character.subclass}`, inline: true },
        { name: '💪 Score', value: character.abilityScore || 'N/A', inline: true },
        { name: '🏰 Guild', value: character.guild || 'None', inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await this.log(guildId, 'character_registration', embed);
  }

  async logCharacterUpdate(guildId, user, field, oldValue, newValue) {
    const embed = new EmbedBuilder()
      .setTitle('✏️ Character Updated')
      .setDescription(`<@${user.id}> updated their character`)
      .addFields(
        { name: '👤 User', value: user.username, inline: true },
        { name: '📝 Field', value: field, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '❌ Old Value', value: String(oldValue) || 'None', inline: true },
        { name: '✅ New Value', value: String(newValue) || 'None', inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await this.log(guildId, 'character_updates', embed);
  }

  async logCharacterDeletion(guildId, user, character, type = 'main') {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Character Deleted')
      .setDescription(`<@${user.id}> deleted their ${type} character`)
      .addFields(
        { name: '👤 User', value: user.username, inline: true },
        { name: '🎮 IGN', value: character.ign || 'N/A', inline: true },
        { name: '🎭 Class', value: `${character.className} - ${character.subclass}`, inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await this.log(guildId, 'character_deletion', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERIFICATION EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async logVerification(guildId, user, type = 'player') {
    const title = type === 'visitor' ? '👋 Visitor Joined' : '✅ Player Verified';
    const description = type === 'visitor' 
      ? `<@${user.id}> joined as a visitor`
      : `<@${user.id}> completed verification`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .addFields(
        { name: '👤 User', value: user.username, inline: true },
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await this.log(guildId, 'verification', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPLICATION EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async logGuildApplication(guildId, user, character, guildName, status = 'pending') {
    const statusEmoji = { pending: '⏳', accepted: '✅', denied: '❌' };

    const embed = new EmbedBuilder()
      .setTitle(`📋 Guild Application ${statusEmoji[status] || ''}`)
      .setDescription(`<@${user.id}> ${status === 'pending' ? 'applied to' : status} **${guildName}**`)
      .addFields(
        { name: '👤 User', value: user.username, inline: true },
        { name: '🎮 IGN', value: character.ign || 'N/A', inline: true },
        { name: '🎭 Class', value: `${character.className} - ${character.subclass}`, inline: true },
        { name: '📊 Status', value: status.charAt(0).toUpperCase() + status.slice(1), inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await this.log(guildId, 'guild_applications', embed);
  }

  async logApplicationVote(guildId, voter, applicantUser, voteType, currentVotes) {
    const emoji = voteType === 'accept' ? '👍' : '👎';
    
    const embed = new EmbedBuilder()
      .setTitle(`🗳️ Application Vote ${emoji}`)
      .setDescription(`<@${voter.id}> voted to **${voteType}** <@${applicantUser.id}>`)
      .addFields(
        { name: '🗳️ Voter', value: voter.username, inline: true },
        { name: '📝 Applicant', value: applicantUser.username, inline: true },
        { name: '📊 Vote', value: voteType.charAt(0).toUpperCase() + voteType.slice(1), inline: true },
        { name: '✅ Accept Votes', value: String(currentVotes.accept || 0), inline: true },
        { name: '❌ Deny Votes', value: String(currentVotes.deny || 0), inline: true }
      )
      .setTimestamp();

    await this.log(guildId, 'application_votes', embed);
  }

  async logAdminOverride(guildId, admin, applicantUser, decision) {
    const emoji = decision === 'accept' ? '✅' : '❌';
    
    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Admin Override ${emoji}`)
      .setDescription(`<@${admin.id}> used admin override to **${decision}** <@${applicantUser.id}>`)
      .addFields(
        { name: '👑 Admin', value: admin.username, inline: true },
        { name: '📝 Applicant', value: applicantUser.username, inline: true },
        { name: '📊 Decision', value: decision.charAt(0).toUpperCase() + decision.slice(1), inline: true }
      )
      .setTimestamp();

    await this.log(guildId, 'admin_overrides', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SETTINGS & ROLE EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async logSettingsChange(guildId, admin, setting, oldValue, newValue) {
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Settings Changed')
      .setDescription(`<@${admin.id}> modified server settings`)
      .addFields(
        { name: '👑 Admin', value: admin.username, inline: true },
        { name: '📝 Setting', value: setting, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '❌ Old Value', value: String(oldValue) || 'None', inline: true },
        { name: '✅ New Value', value: String(newValue) || 'None', inline: true }
      )
      .setTimestamp();

    await this.log(guildId, 'settings_changes', embed);
  }

  async logRoleChange(guildId, user, action, roleName) {
    const emoji = action === 'added' ? '➕' : '➖';
    
    const embed = new EmbedBuilder()
      .setTitle(`🎭 Role ${action.charAt(0).toUpperCase() + action.slice(1)} ${emoji}`)
      .setDescription(`<@${user.id}> ${action === 'added' ? 'received' : 'lost'} a role`)
      .addFields(
        { name: '👤 User', value: user.username, inline: true },
        { name: '🎭 Role', value: roleName, inline: true },
        { name: '📊 Action', value: action.charAt(0).toUpperCase() + action.slice(1), inline: true }
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await this.log(guildId, 'role_changes', embed);
  }
}

const discordLogger = new DiscordLogger();
export default discordLogger;
