import discord from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder } = discord;
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../../components/buttons/characterButtons.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription('Manage your character profile'),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: config.ephemeral.editChar });
      
      const userId = interaction.user.id;
      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      
      // If no main character, show registration
      if (!mainChar) {
        const embed = new EmbedBuilder()
          .setColor('#EC4899')
          .setTitle('🎮 Character Registration')
          .setDescription('Click the button below to start registering your main character!')
          .setTimestamp();

        const buttons = buildCharacterButtons(null, 0, 0, userId);
        
        await interaction.editReply({ 
          embeds: [embed], 
          components: buttons
        });
        
        logger.logAction(interaction.user.tag, 'started registration');
        return;
      }
      
      // If has character, show edit interface
      const alts = characters.filter(c => c.character_type === 'alt');
      const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      
      const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
      const buttons = buildCharacterButtons(mainChar, alts.length, subclasses.length, userId);
      
      await interaction.editReply({ embeds: [embed], components: buttons });
      logger.logAction(interaction.user.username, 'opened character management');
      
    } catch (error) {
      logger.error(`Character command error: ${error.message}`);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error occurred.', 
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Error occurred.' });
      }
    }
  }
};
