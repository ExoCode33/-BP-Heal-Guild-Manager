import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

export function profileButtons(userId, hasMain = false) {
  const addCharacterButton = new ButtonBuilder()
    .setCustomId(`add_character_${userId}`)
    .setLabel('➕ Add Character')
    .setStyle(ButtonStyle.Success);

  const editButton = new ButtonBuilder()
    .setCustomId(`edit_character_${userId}`)
    .setLabel('✏️ Edit Character')
    .setStyle(ButtonStyle.Primary);

  const removeButton = new ButtonBuilder()
    .setCustomId(`remove_character_${userId}`)
    .setLabel('🗑️ Remove Character')
    .setStyle(ButtonStyle.Danger);

  const row1 = new ActionRowBuilder().addComponents(addCharacterButton, editButton);
  const row2 = new ActionRowBuilder().addComponents(removeButton);

  return [row1, row2];
}

export default {
  profileButtons
};
