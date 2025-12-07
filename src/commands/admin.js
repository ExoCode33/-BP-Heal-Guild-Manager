import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for managing member registrations')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('manage-member')
        .setDescription('Manage a member\'s character registrations')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to manage')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view-member')
        .setDescription('View a member\'s character details')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to view')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list-all')
        .setDescription('List all registered members')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sync')
        .setDescription('Manually sync all character data to Google Sheets')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'manage-member':
          await this.handleManageMember(interaction);
          break;
        case 'view-member':
          await this.handleViewMember(interaction);
          break;
        case 'list-all':
          await this.handleListAll(interaction);
          break;
        case 'sync':
          await this.handleSync(interaction);
          break;
      }
    } catch (error) {
      console.error('Error in admin command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyMethod]({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  async handleManageMember(interaction) {
    const targetUser = interaction.options.getUser('user');
    await this.showManagementMenu(interaction, targetUser);
  },

  async showManagementMenu(interaction, targetUser, isUpdate = false) {
    // Get target user's current registration status
    const mainChar = await queries.getMainCharacter(targetUser.id);
    const alts = mainChar ? await queries.getAltCharacters(targetUser.id) : [];

    const embed = new EmbedBuilder()
      .setColor('#FF6B00')
      .setTitle('🛡️ Admin: Member Management')
      .setDescription(`Managing **${targetUser.tag}**'s character registrations`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Admin: ${interaction.user.tag}` })
      .setTimestamp();

    // Add current status
    if (mainChar) {
      embed.addFields(
        { 
          name: '⭐ Main Character', 
          value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}\n**Ability Score:** ${mainChar.ability_score || 'N/A'}`, 
          inline: true 
        }
      );
      
      if (alts.length > 0) {
        embed.addFields({
          name: '📋 Alt Characters',
          value: alts.map(alt => `• ${alt.ign} (${alt.class} - ${alt.subclass})`).join('\n'),
          inline: true
        });
      }
    } else {
      embed.addFields({
        name: '📝 Status',
        value: 'No main character registered',
        inline: false
      });
    }

    // Build button rows
    const rows = [];

    // Row 1: Main character actions
    const row1 = new ActionRowBuilder();
    
    if (!mainChar) {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_add_main_${targetUser.id}`)
          .setLabel('Add Main for User')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⭐')
      );
    } else {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_remove_main_${targetUser.id}`)
          .setLabel('Remove Main')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    }
    
    rows.push(row1);

    // Row 2: Alt character actions (only if they have a main)
    if (mainChar) {
      const row2 = new ActionRowBuilder();
      
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_add_alt_${targetUser.id}`)
          .setLabel('Add Alt for User')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_remove_alt_${targetUser.id}`)
            .setLabel('Remove Alt')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
        );
      }
      
      rows.push(row2);
    }

    // Row 3: View and Close buttons
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_refresh_${targetUser.id}`)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId(`admin_close_${targetUser.id}`)
        .setLabel('Close')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    );
    
    rows.push(row3);

    if (isUpdate) {
      await interaction.update({ embeds: [embed], components: rows });
    } else {
      await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
  },

  async handleViewMember(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    // Get all user data
    const allCharacters = await queries.getAllCharactersWithSubclasses(targetUser.id);
    const userTimezone = await queries.getUserTimezone(targetUser.id);
    
    if (allCharacters.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Registration Found')
        .setDescription(`**${targetUser.tag}** has not registered any characters.`)
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Organize characters by hierarchy
    const mainChar = allCharacters.find(c => c.character_type === 'main');
    const mainSubclasses = allCharacters.filter(c => c.character_type === 'main_subclass');
    const alts = allCharacters.filter(c => c.character_type === 'alt');
    
    // Get subclasses for each alt
    const altsWithSubclasses = alts.map(alt => ({
      ...alt,
      subclasses: allCharacters.filter(c => 
        c.character_type === 'alt_subclass' && c.parent_character_id === alt.id
      )
    }));

    // Build premium embed matching edit-member-details style
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setAuthor({ 
        name: `🛡️ Admin View: ${targetUser.tag}'s Profile`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .setTimestamp();

    // === PROFILE HEADER ===
    let timezoneDisplay = '🌍 *No timezone set*';
    
    if (userTimezone?.timezone) {
      // Get timezone offset
      const timezoneOffsets = {
        'PST': -8, 'PDT': -7,
        'MST': -7, 'MDT': -6,
        'CST': -6, 'CDT': -5,
        'EST': -5, 'EDT': -4,
        'UTC': 0, 'GMT': 0,
        'CET': 1, 'CEST': 2,
        'JST': 9, 'KST': 9,
        'AEST': 10, 'AEDT': 11
      };
      
      const offset = timezoneOffsets[userTimezone.timezone] || 0;
      const now = new Date();
      const localTime = new Date(now.getTime() + (offset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
      const hours = localTime.getHours();
      const minutes = localTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
    }
    
    embed.setDescription(
      `${timezoneDisplay}\n`
    );

    // === MAIN CHARACTER CARD ===
    if (mainChar) {
      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      
      embed.addFields({
        name: '⭐ **MAIN CHARACTER**',
        value: 
          '```ansi\n' +
          `✨ \u001b[1;36mIGN:\u001b[0m       ${mainChar.ign}\n` +
          `\n` +
          `🏰 \u001b[1;34mGuild:\u001b[0m     ${mainChar.guild || 'None'}\n` +
          `🎭 \u001b[1;33mClass:\u001b[0m     ${mainChar.class}\n` +
          `🎯 \u001b[1;35mSubclass:\u001b[0m  ${mainChar.subclass}\n` +
          `${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m      ${mainChar.role}\n` +
          `\n` +
          `💪 \u001b[1;31mAbility Score:\u001b[0m ${mainChar.ability_score?.toLocaleString() || 'N/A'}\n` +
          '```',
        inline: false
      });

      // === MAIN SUBCLASSES (if any) ===
      if (mainSubclasses.length > 0) {
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const subclassText = mainSubclasses.map((sc, i) => {
          const numberEmoji = numberEmojis[i] || `${i + 1}.`;
          return (
            '```ansi\n' +
            `${numberEmoji} ${sc.class} › ${sc.subclass} › ${sc.role}\n` +
            `   \u001b[1;31mAS:\u001b[0m ${sc.ability_score?.toLocaleString() || 'N/A'}\n` +
            '```'
          );
        }).join('');

        embed.addFields({
          name: '📊 **SUBCLASSES**',
          value: subclassText,
          inline: false
        });
      }
    }

    // === ALT CHARACTERS (if any) ===
    if (altsWithSubclasses.length > 0) {
      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      
      const allAltsText = altsWithSubclasses.map((alt, altIndex) => {
        const numberEmoji = numberEmojis[altIndex] || `${altIndex + 1}.`;
        
        return (
          '```ansi\n' +
          `${numberEmoji} \u001b[1;36mIGN:\u001b[0m ${alt.ign}  •  \u001b[1;34mGuild:\u001b[0m ${alt.guild || 'None'}\n` +
          `   ${alt.class} › ${alt.subclass} › ${alt.role}\n` +
          `   \u001b[1;31mAS:\u001b[0m ${alt.ability_score?.toLocaleString() || 'N/A'}\n` +
          '```'
        );
      }).join('');

      embed.addFields({
        name: '📋 **ALT CHARACTERS**',
        value: allAltsText,
        inline: false
      });
    }

    // Footer
    const totalChars = allCharacters.length;
    embed.setFooter({ 
      text: `${totalChars} character${totalChars !== 1 ? 's' : ''} registered • Admin View • Last updated`,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleListAll(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const allCharacters = await queries.getAllMainCharacters();
    
    if (allCharacters.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📋 No Registrations')
        .setDescription('No members have registered yet.')
        .setTimestamp();
      
      return interaction.editReply({ embeds: [embed] });
    }

    // Group by guild
    const byGuild = {};
    const noGuild = [];

    for (const char of allCharacters) {
      if (char.guild) {
        if (!byGuild[char.guild]) byGuild[char.guild] = [];
        byGuild[char.guild].push(char);
      } else {
        noGuild.push(char);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 All Registered Members')
      .setDescription(`Total: **${allCharacters.length}** members`)
      .setTimestamp();

    // Add guild sections
    for (const [guild, members] of Object.entries(byGuild)) {
      const memberList = members
        .map(m => `• ${m.discord_name} - ${m.ign} (${m.class} - ${m.role})`)
        .join('\n');
      
      embed.addFields({
        name: `🏰 ${guild} (${members.length})`,
        value: memberList.substring(0, 1024), // Discord field limit
        inline: false
      });
    }

    // Add no guild section
    if (noGuild.length > 0) {
      const memberList = noGuild
        .map(m => `• ${m.discord_name} - ${m.ign} (${m.class} - ${m.role})`)
        .join('\n');
      
      embed.addFields({
        name: `📝 No Guild (${noGuild.length})`,
        value: memberList.substring(0, 1024),
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },

  async handleSync(interaction) {
    const googleSheets = await import('../services/googleSheets.js');
    
    try {
      const startEmbed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🔄 Starting Sync...')
        .setDescription('Syncing all character data to Google Sheets. This may take a moment.')
        .setTimestamp();
      
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ embeds: [startEmbed] });

      // Get all characters with subclasses
      const allChars = await queries.getAllCharacters();

      // Sync to Google Sheets
      await googleSheets.default.fullSync(allChars);

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Sync Complete!')
        .setDescription('All character data has been successfully synced to Google Sheets.')
        .addFields(
          { name: '📊 Total Characters', value: `${allChars.length} synced`, inline: true }
        )
        .setFooter({ text: '📊 Data synchronized successfully' })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error in admin sync command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Sync Failed')
        .setDescription('An error occurred while syncing to Google Sheets.')
        .addFields({ 
          name: '🔍 Error Details', 
          value: error.message || 'Unknown error', 
          inline: false 
        })
        .setFooter({ text: 'Please check the logs for more information' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  async handleRefresh(interaction, targetUserId) {
    const targetUser = await interaction.client.users.fetch(targetUserId);
    await this.showManagementMenu(interaction, targetUser, true);
  },

  async handleClose(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✅ Admin Panel Closed')
      .setDescription('Management session ended.')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
  },

  // Helper: Get role emoji
  getRoleEmoji(role) {
    const roleEmojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return roleEmojis[role] || '⭐';
  }
};
