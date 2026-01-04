import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { CharacterRepo } from '../database/repositories.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/embeds.js';
import { COLORS } from '../config/game.js';
import logger from '../services/logger.js';
import * as classRoleService from '../services/classRoles.js';

// ═══════════════════════════════════════════════════════════════════
// DELETE CHARACTER - SELECT CHARACTER
// ═══════════════════════════════════════════════════════════════════

export async function start(interaction, userId) {
  console.log('[DELETE] Starting delete for user:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);

  if (characters.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription('# ❌ **No Characters**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYou have no characters to delete.')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FF9900')
    .setDescription(
      '# 🗑️ **Delete Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '⚠️ **Warning:** This action cannot be undone!\n\n' +
      'Select the character you want to delete.'
    )
    .setTimestamp();

  const characterOptions = characters.map(char => {
    const config = require('../config/index.js').default;
    const CLASSES = config.game?.classes || {};
    const iconId = CLASSES[char.class]?.iconId || null;
    const emoji = iconId ? { id: iconId } : '🎮';
    
    return {
      label: `${char.ign} (${char.class})`,
      value: String(char.id),
      description: `${char.subclass} - ${char.ability_score}`,
      emoji: emoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_delete_character_${userId}`)
    .setPlaceholder('🗑️ Select character to delete')
    .addOptions(characterOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back to Profile')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ═══════════════════════════════════════════════════════════════════
// DELETE CHARACTER - CONFIRM
// ═══════════════════════════════════════════════════════════════════

export async function selectCharacter(interaction, userId) {
  const characterId = parseInt(interaction.values[0]);
  const character = await CharacterRepo.findById(characterId);

  if (!character) {
    await interaction.update({
      content: '❌ Character not found.',
      components: []
    });
    return;
  }

  console.log('[DELETE] Selected character:', characterId, character.ign);

  const isMain = character.character_type === 'main';
  const subclasses = isMain ? await CharacterRepo.findSubclasses(characterId) : [];

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setDescription(
      `# ⚠️ **Confirm Deletion**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '**You are about to delete:**\n\n' +
      `🎮 **IGN:** ${character.ign}\n` +
      `🆔 **UID:** ${character.uid}\n` +
      `🎭 **Class:** ${character.class} - ${character.subclass}\n` +
      `💪 **Score:** ${character.ability_score}\n` +
      `🏰 **Guild:** ${character.guild}\n\n` +
      (isMain && subclasses.length > 0
        ? `⚠️ **This will also delete ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''}:**\n` +
          subclasses.map(s => `  • ${s.class} - ${s.subclass}`).join('\n') + '\n\n'
        : '') +
      '**This action cannot be undone!**'
    )
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_delete_${userId}_${characterId}`)
    .setLabel('✅ Yes, Delete')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_delete_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.update({ embeds: [embed], components: [row] });
}

// ═══════════════════════════════════════════════════════════════════
// DELETE CHARACTER - EXECUTE
// ═══════════════════════════════════════════════════════════════════

export async function confirmDelete(interaction, userId, characterId) {
  console.log('[DELETE] Confirming delete for character:', characterId);

  try {
    const character = await CharacterRepo.findById(characterId);

    if (!character) {
      await interaction.update({
        content: '❌ Character not found.',
        components: []
      });
      return;
    }

    const isMain = character.character_type === 'main';
    const characterClass = character.class;

    // Delete subclasses if this is a main character
    if (isMain) {
      await CharacterRepo.deleteSubclasses(characterId);
      console.log('[DELETE] Deleted subclasses for main:', characterId);
    }

    // Delete the character
    await CharacterRepo.delete(characterId);
    console.log('[DELETE] Deleted character:', characterId);

    // Update class roles - check if the class is still used by other characters
    const remainingCharacters = await CharacterRepo.findAllByUser(userId);
    const stillUsesClass = remainingCharacters.some(c => c.class === characterClass);

    if (!stillUsesClass) {
      await classRoleService.removeClassRole(userId, characterClass);
      console.log('[DELETE] Removed class role:', characterClass);
    }

    // Show updated profile
    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    if (characters.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setDescription(
          '# ✅ **Character Deleted**\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          `**${character.ign}** has been deleted.\n\n` +
          'You have no characters registered.\n' +
          'Use `/register` to create a new character.'
        )
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
    } else {
      const embed = await profileEmbed(interaction.user, characters, interaction);
      const buttons = ui.profileButtons(userId, !!main);

      await interaction.update({
        embeds: [embed],
        components: buttons
      });
    }

    logger.delete(interaction.user.username, character.ign, character.class);
  } catch (error) {
    console.error('[DELETE ERROR]', error);
    logger.error('Delete', `Delete error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// DELETE CHARACTER - CANCEL
// ═══════════════════════════════════════════════════════════════════

export async function cancelDelete(interaction, userId) {
  console.log('[DELETE] Cancelled delete for user:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');

  const embed = await profileEmbed(interaction.user, characters, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  await interaction.update({
    embeds: [embed],
    components: buttons
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  start,
  selectCharacter,
  confirmDelete,
  cancelDelete
};
