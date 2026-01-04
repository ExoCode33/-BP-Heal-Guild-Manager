import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function profileButtons(userId, hasMain) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  if (hasMain) {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`add_subclass_${userId}`)
        .setLabel('Add Subclass')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`add_alt_${userId}`)
        .setLabel('Add Alt Character')
        .setEmoji('🎭')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`edit_character_${userId}`)
        .setLabel('Edit Character')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary)
    );

    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`remove_character_${userId}`)
        .setLabel('Remove')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2];
  } else {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`register_${userId}`)
        .setLabel('Register')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Success)
    );

    return [row1];
  }
}

export default {
  profileButtons
};
