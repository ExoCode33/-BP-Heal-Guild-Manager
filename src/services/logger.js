import { EmbedBuilder } from 'discord.js';
import pool from '../database/index.js';
import { COLORS } from '../config/game.js';

// ═══════════════════════════════════════════════════════════════════
// PROFESSIONAL LOGGER WITH VOTE TRACKING
// ═══════════════════════════════════════════════════════════════════

class ProfessionalLogger {
  constructor() {
    this.client = null;
  }

  async init(client) {
    this.client = client;
    global.client = client;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CHARACTER EVENTS
  // ═══════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════
  // APPLICATION EVENTS WITH VOTER NAMES
  // ═══════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════
  // SYSTEM EVENTS
  // ═══════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════
  // OLD LOGGER METHODS (for backwards compatibility)
  // ═══════════════════════════════════════════════════════════════════

  startup(tag, commandCount) {
    console.log(`✅ [STARTUP] ${tag} | ${commandCount} commands loaded`);
  }

  shutdown(reason) {
    console.log(`🔴 [SHUTDOWN] Reason: ${reason}`);
  }

  command(name, user, subcommand) {
    console.log(`⚡ [COMMAND] /${name} ${subcommand || ''} by ${user}`);
  }

  register(user, type, ign, classInfo) {
    console.log(`📝 [REGISTER] ${user} | ${type} | ${ign} | ${classInfo}`);
  }

  edit(user, field, oldVal, newVal) {
    console.log(`✏️ [EDIT] ${user} | ${field}: ${oldVal} → ${newVal}`);
  }

  delete(user, type, label) {
    console.log(`🗑️ [DELETE] ${user} | ${type} | ${label}`);
  }

  viewProfile(viewer, target) {
    console.log(`👁️ [VIEW] ${viewer} viewed ${target}'s profile`);
  }

  info(category, message) {
    console.log(`ℹ️ [${category.toUpperCase()}] ${message}`);
  }

  error(category, message, error) {
    console.error(`❌ [${category.toUpperCase()}] ${message}`, error);
  }

  nicknameSync(updated, failed) {
    console.log(`🏷️ [NICKNAME] Updated: ${updated} | Failed: ${failed}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

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
      console.error('[LOGGER] Failed to send log:', error.message);
    }
  }

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
      console.error('[LOGGER] Failed to get settings:', error);
      return { generalChannelId: null, applicationChannelId: null, settings: {} };
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
    // Placeholder for grouping
    return {};
  }

  async setGroupingWindow(guildId, minutes) {
    // Placeholder for grouping window
  }
}

export const Logger = new ProfessionalLogger();
export default new ProfessionalLogger();
