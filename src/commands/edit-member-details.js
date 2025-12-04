import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('edit-member-details')
    .setDescription('Manage your character registrations'),

  async execute(interaction) {
    try {
      await this.showMainMenu(interaction);
    } catch (error) {
      console.error('Error in edit-member-details command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyMethod]({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  async showMainMenu(interaction, isUpdate = false) {
    // Get user's current registration status
    const mainChar = await queries.getMainCharacter(interaction.user.id);
    const alts = mainChar ? await queries.getAltCharacters(interaction.user.id) : [];

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 Member Details Management')
      .setDescription('Choose what you\'d like to do:')
      .setFooter({ text: '💡 Select an action below' })
      .setTimestamp();

    // Add current status
    if (mainChar) {
      embed.addFields(
        { 
          name: '⭐ Main Character', 
          value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}`, 
          inline: true 
        }
      );
      
      if (alts.length > 0) {
        embed.addFields({
          name: '📋 Alt Characters',
          value: alts.map(alt => `• ${alt.ign} (${alt.class})`).join('\n'),
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

    // Build button rows based on current state
    const rows = [];

    // Row 1: Main character actions
    const row1 = new ActionRowBuilder();
    
    if (!mainChar) {
      // Only show "Add Main" if they don't have one
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_add_main_${interaction.user.id}`)
          .setLabel('Add Main Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⭐')
      );
    } else {
      // Show both Edit and Remove if they have a main
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_update_main_${interaction.user.id}`)
          .setLabel('Edit Main Character')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`edit_remove_main_${interaction.user.id}`)
          .setLabel('Remove Main Character')
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
          .setCustomId(`edit_add_alt_${interaction.user.id}`)
          .setLabel('Add Alt Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_remove_alt_${interaction.user.id}`)
            .setLabel('Remove Alt Character')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
        );
      }
      
      rows.push(row2);
    }

    // Row 3: View and Close buttons
    const row3 = new ActionRowBuilder();
    
    if (mainChar) {
      row3.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_view_chars_${interaction.user.id}`)
          .setLabel('View All Characters')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👀')
      );
    }
    
    row3.addComponents(
      new ButtonBuilder()
        .setCustomId(`edit_close_${interaction.user.id}`)
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

  async handleViewChars(interaction) {
    // ✅ FIXED: Simply call view-char and let it send a new message
    const viewChar = await import('./view-char.js');
    await viewChar.default.execute(interaction);
  },

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  },

  async handleClose(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✅ Menu Closed')
      .setDescription('You can reopen this menu anytime with `/edit-member-details`')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
  }
};
