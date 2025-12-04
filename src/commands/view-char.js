import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('view-char')
    .setDescription('View your registered characters')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another user\'s characters (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const targetUser = interaction.options?.getUser('user') || interaction.user;
      const isOwnProfile = targetUser.id === interaction.user.id;

      // Get all user data
      const allCharacters = await queries.getAllCharactersWithSubclasses(targetUser.id);
      const userTimezone = await queries.getUserTimezone(targetUser.id);

      if (allCharacters.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('📋 No Characters Found')
          .setDescription(isOwnProfile 
            ? 'You haven\'t registered any characters yet!'
            : `**${targetUser.tag}** hasn't registered any characters yet.`)
          .addFields({ 
            name: '🎮 Get Started', 
            value: isOwnProfile ? 'Use `/edit-member-details` to register!' : 'They need to use `/edit-member-details` to get started.', 
            inline: false 
          })
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

      // Build professional embed
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('📋 Character Profile')
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      // Header: Discord Name & Timezone
      const headerValue = [
        `**Discord:** ${targetUser.tag}`,
        `**Timezone:** ${userTimezone?.timezone ? `🌍 ${userTimezone.timezone}` : '*Not set*'}`
      ].join('\n');

      embed.addFields({
        name: '👤 Profile Information',
        value: headerValue,
        inline: false
      });

      // Main Character Section
      if (mainChar) {
        const mainValue = [
          `**IGN:** ${mainChar.ign}`,
          `**Class:** ${mainChar.class} (${mainChar.subclass})`,
          `**Role:** ${mainChar.role}`,
          `**Ability Score:** ${mainChar.ability_score?.toLocaleString() || '*Not set*'}`,
          `**Guild:** ${mainChar.guild || '*Not set*'}`
        ].join('\n');

        embed.addFields({
          name: '⭐ Main Character',
          value: mainValue,
          inline: false
        });

        // Main Character Subclasses
        if (mainSubclasses.length > 0) {
          mainSubclasses.forEach((subclass, index) => {
            const subclassValue = [
              `**Class:** ${subclass.class} (${subclass.subclass})`,
              `**Ability Score:** ${subclass.ability_score?.toLocaleString() || '*Not set*'}`
            ].join('\n');

            embed.addFields({
              name: `  📌 Subclass ${index + 1}`,
              value: subclassValue,
              inline: true
            });
          });
        }
        
        // Spacer after main section if there are alts
        if (altsWithSubclasses.length > 0) {
          embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
        }
      }

      // Alt Characters Section
      altsWithSubclasses.forEach((alt, altIndex) => {
        const altValue = [
          `**IGN:** ${alt.ign}`,
          `**Class:** ${alt.class} (${alt.subclass})`,
          `**Role:** ${alt.role}`,
          `**Ability Score:** ${alt.ability_score?.toLocaleString() || '*Not set*'}`,
          `**Guild:** ${alt.guild || '*Not set*'}`
        ].join('\n');

        embed.addFields({
          name: `📋 Alt Character ${altIndex + 1}`,
          value: altValue,
          inline: false
        });

        // Alt's Subclasses
        if (alt.subclasses.length > 0) {
          alt.subclasses.forEach((subclass, subIndex) => {
            const subclassValue = [
              `**Class:** ${subclass.class} (${subclass.subclass})`,
              `**Ability Score:** ${subclass.ability_score?.toLocaleString() || '*Not set*'}`
            ].join('\n');

            embed.addFields({
              name: `  📌 Subclass ${subIndex + 1}`,
              value: subclassValue,
              inline: true
            });
          });
        }

        // Spacer between alts
        if (altIndex < altsWithSubclasses.length - 1) {
          embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
        }
      });

      // Footer
      const totalChars = allCharacters.length;
      embed.setFooter({ text: `Total: ${totalChars} character${totalChars !== 1 ? 's' : ''}` });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error in view-char command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while fetching character information.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
