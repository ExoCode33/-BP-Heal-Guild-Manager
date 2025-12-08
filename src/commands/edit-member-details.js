import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

// ✅ Ephemeral configuration (matches character.js)
const EPHEMERAL_CONFIG = {
  editMemberDetails: process.env.EDIT_MEMBER_DETAILS_EPHEMERAL !== 'false',
};

export default {
  data: new SlashCommandBuilder()
    .setName('edit-member-details')
    .setDescription('Manage your character registrations'),

  async execute(interaction) {
    try {
      await this.showMainMenu(interaction, false);
    } catch (error) {
      console.error('Error in edit-member-details command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // Private error message
    }
  },

  async showMainMenu(interaction, isUpdate = false) {
    const userId = interaction.user.id;
    const mainChar = await queries.getMainCharacter(userId);
    const allCharacters = mainChar ? await queries.getAllCharactersWithSubclasses(userId) : [];
    const alts = allCharacters.filter(char => char.character_type === 'alt');
    const userTimezone = await queries.getUserTimezone(userId);

    const embed = new EmbedBuilder()
      .setColor(mainChar ? '#6640D9' : '#5865F2')
      .setAuthor({ 
        name: `${interaction.user.tag}'s Character Profile`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
      .setFooter({ text: '💡 Click buttons below to manage your characters' })
      .setTimestamp();

    if (!mainChar) {
      embed.setDescription('**No main character registered yet.**\n\nUse the button below to register your first character!');
    } else {
      // ✅ FIXED: Calculate timezone display with corrected UTC-based formula
      let timezoneDisplay = '🌍 *No timezone set*';
      
      if (userTimezone?.timezone) {
        const timezoneOffsets = {
          'PST': -8, 'PDT': -7, 'MST': -7, 'MDT': -6, 'CST': -6, 'CDT': -5,
          'EST': -5, 'EDT': -4, 'AST': -4, 'ADT': -3, 'NST': -3.5, 'NDT': -2.5,
          'AKST': -9, 'AKDT': -8, 'HST': -10,
          'UTC': 0, 'GMT': 0, 'WET': 0, 'WEST': 1, 'CET': 1, 'CEST': 2,
          'EET': 2, 'EEST': 3, 'TRT': 3, 'MSK': 3, 'GST': 4, 'IST': 5.5,
          'ICT': 7, 'WIB': 7, 'SGT': 8, 'HKT': 8, 'PHT': 8, 'MYT': 8,
          'JST': 9, 'KST': 9, 'AEST': 10, 'AEDT': 11, 'AWST': 8,
          'NZDT': 13, 'NZST': 12
        };
        
        // Map full timezone names to abbreviations
        const timezoneAbbreviations = {
          'America/New_York': 'EST', 'America/Chicago': 'CST', 'America/Denver': 'MST',
          'America/Los_Angeles': 'PST', 'America/Phoenix': 'MST', 'America/Anchorage': 'AKST',
          'Pacific/Honolulu': 'HST', 'America/Toronto': 'EST', 'America/Vancouver': 'PST',
          'America/Halifax': 'AST', 'America/St_Johns': 'NST', 'America/Edmonton': 'MST',
          'America/Winnipeg': 'CST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
          'Europe/Berlin': 'CET', 'Europe/Rome': 'CET', 'Europe/Madrid': 'CET',
          'Europe/Amsterdam': 'CET', 'Europe/Brussels': 'CET', 'Europe/Vienna': 'CET',
          'Europe/Stockholm': 'CET', 'Europe/Oslo': 'CET', 'Europe/Copenhagen': 'CET',
          'Europe/Helsinki': 'EET', 'Europe/Athens': 'EET', 'Europe/Istanbul': 'TRT',
          'Europe/Moscow': 'MSK', 'Europe/Zurich': 'CET', 'Europe/Dublin': 'GMT',
          'Europe/Lisbon': 'WET', 'Europe/Warsaw': 'CET', 'Asia/Tokyo': 'JST',
          'Asia/Seoul': 'KST', 'Asia/Shanghai': 'CST', 'Asia/Hong_Kong': 'HKT',
          'Asia/Singapore': 'SGT', 'Asia/Dubai': 'GST', 'Asia/Kolkata': 'IST',
          'Asia/Bangkok': 'ICT', 'Asia/Jakarta': 'WIB', 'Asia/Manila': 'PHT',
          'Asia/Kuala_Lumpur': 'MYT', 'Australia/Sydney': 'AEDT', 'Australia/Melbourne': 'AEDT',
          'Australia/Brisbane': 'AEST', 'Australia/Perth': 'AWST', 'Pacific/Auckland': 'NZDT'
        };
        
        const abbrev = timezoneAbbreviations[userTimezone.timezone] || userTimezone.timezone;
        const offset = timezoneOffsets[abbrev] || 0;
        
        // Calculate user's local time from UTC
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        
        // Add offset to UTC to get user's local time
        let localHours = utcHours + offset;
        let localMinutes = utcMinutes;
        
        // Handle day overflow
        if (localHours >= 24) localHours -= 24;
        if (localHours < 0) localHours += 24;
        
        const ampm = localHours >= 12 ? 'PM' : 'AM';
        const displayHours = localHours % 12 || 12;
        const minutes = localMinutes.toString().padStart(2, '0');
        
        timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
      }
      
      embed.setDescription(`${timezoneDisplay}\n`);

      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      const mainClassEmoji = this.getClassEmoji(mainChar.class);
      
      // ✅ FIXED: Format ability score as range
      const formattedAbilityScore = this.formatAbilityScore(mainChar.ability_score);
      
      embed.addFields({
        name: '⭐ **MAIN CHARACTER**',
        value: 
          `**${mainClassEmoji} IGN:** ${mainChar.ign}\n` +
          `**🏰 Guild:** ${mainChar.guild || 'None'}\n` +
          `**🎭 Class:** ${mainChar.class}\n` +
          `**📚 Subclass:** ${mainChar.subclass}\n` +
          `**${mainRoleEmoji} Role:** ${mainChar.role}\n` +
          `**💪 Ability Score:** ${formattedAbilityScore}`,
        inline: false
      });

      if (alts && alts.length > 0) {
        const altsList = alts.map(alt => {
          const altRoleEmoji = this.getRoleEmoji(alt.role);
          const altClassEmoji = this.getClassEmoji(alt.class);
          const altAbilityScore = this.formatAbilityScore(alt.ability_score);
          return (
            `**${altClassEmoji} ${alt.ign}**\n` +
            `${altRoleEmoji} ${alt.role} • ${alt.class} (${alt.subclass})\n` +
            `💪 AS: ${altAbilityScore}`
          );
        }).join('\n\n');

        embed.addFields({
          name: `🎭 **ALT CHARACTERS** (${alts.length})`,
          value: altsList,
          inline: false
        });
      }

      embed.addFields({
        name: '\u200B',
        value: `**Total Characters:** ${alts.length + 1}`,
        inline: false
      });
    }

    // ✅ Use the new buildButtonRows function
    const components = this.buildButtonRows(mainChar, alts, userId);

    // ✅ Use flags instead of ephemeral (Discord.js deprecation fix)
    const replyOptions = { embeds: [embed], components };
    if (EPHEMERAL_CONFIG.editMemberDetails) {
      replyOptions.flags = 64; // MessageFlags.Ephemeral
    }

    if (isUpdate) {
      await interaction.update(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  },

  // ✅ NEW: Format ability score to range display
  formatAbilityScore(score) {
    if (!score || score === '' || score === 0) return 'Not set';
    
    const numScore = parseInt(score);
    
    // Map stored values to display labels
    const scoreRanges = {
      10000: '≤10k',
      11000: '10-12k',
      13000: '12-14k',
      15000: '14-16k',
      17000: '16-18k',
      19000: '18-20k',
      21000: '20-22k',
      23000: '22-24k',
      25000: '24-26k',
      27000: '26-28k',
      29000: '28-30k',
      31000: '30-32k',
      33000: '32-34k',
      35000: '34-36k',
      37000: '36-38k',
      39000: '38-40k',
      41000: '40-42k',
      43000: '42-44k',
      45000: '44-46k',
      47000: '46-48k',
      49000: '48-50k',
      51000: '50-52k',
      53000: '52-54k',
      55000: '54-56k',
      57000: '56k+'
    };
    
    return scoreRanges[numScore] || `~${numScore.toLocaleString()}`;
  },

  getClassEmoji(className) {
    const emojis = {
      'Beat Performer': '🎵',
      'Frost Mage': '❄️',
      'Heavy Guardian': '🛡️',
      'Marksman': '🏹',
      'Shield Knight': '⚔️',
      'Stormblade': '⚡',
      'Verdant Oracle': '🌿',
      'Wind Knight': '💨'
    };
    return emojis[className] || '⭐';
  },

  getRoleEmoji(role) {
    const emojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return emojis[role] || '⭐';
  },

  // ✅ NEW: Build button rows (used by both edit-member-details and admin)
  buildButtonRows(mainChar, alts, userId) {
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    if (mainChar) {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_main_${userId}`)
          .setLabel('✏️ Edit Main')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`add_subclass_${userId}`)
          .setLabel('➕ Add Subclass')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`add_alt_${userId}`)
          .setLabel('🎭 Add Alt')
          .setStyle(ButtonStyle.Success)
      );

      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`remove_alt_${userId}`)
          .setLabel('❌ Remove Alt')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(alts.length === 0),
        new ButtonBuilder()
          .setCustomId(`remove_subclass_${userId}`)
          .setLabel('🗑️ Remove Subclass')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`remove_main_${userId}`)
          .setLabel('⚠️ Remove Main')
          .setStyle(ButtonStyle.Danger)
      );

      return [row1, row2];
    } else {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`register_main_${userId}`)
          .setLabel('⭐ Register Main Character')
          .setStyle(ButtonStyle.Success)
      );

      return [row1];
    }
  }
};
