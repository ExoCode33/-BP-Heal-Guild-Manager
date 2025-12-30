import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';
import { COLORS } from '../config/game.js';

export const data = new SlashCommandBuilder()
  .setName('view-character')
  .setDescription('View a character profile')
  .addUserOption(opt => opt
    .setName('user')
    .setDescription('User to view (leave empty to view your own)')
    .setRequired(false));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isOwn = targetUser.id === interaction.user.id;

  logger.command('view-character', interaction.user.username, isOwn ? 'self' : targetUser.username);

  const chars = await CharacterRepo.findAllByUser(targetUser.id);
  const main = chars.find(c => c.character_type === 'main');
  
  const isEph = await isEphemeral(interaction.guildId, 'view_character');
  const ephemeralFlag = isEph ? { flags: MessageFlags.Ephemeral } : {};

  // Check if user has no character
  if (!main && chars.length === 0) {
    // ✅ If viewing your OWN profile → show register button
    if (isOwn) {
      const embed = await profileEmbed(interaction.user, chars, interaction);
      const components = ui.profileButtons(interaction.user.id, false);
      return interaction.reply({ embeds: [embed], components, ...ephemeralFlag });
    }
    
    // ✅ If viewing SOMEONE ELSE → show friendly info message (not error)
    const infoEmbed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription(`# 📋 No Profile Found\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**${targetUser.username}** hasn't registered yet.\n\nThey can use \`/edit-character\` to get started!`)
      .setTimestamp();
    
    return interaction.reply({
      embeds: [infoEmbed],
      ...ephemeralFlag
    });
  }

  if (!isOwn) {
    logger.viewProfile(interaction.user.username, targetUser.username);
  }

  // View only - no edit buttons when viewing others
  const embed = await profileEmbed(targetUser, chars, interaction);
  return interaction.reply({ embeds: [embed], components: [], ...ephemeralFlag });
}
