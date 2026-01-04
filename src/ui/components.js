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

  // Only show Discord Nickname button if user has a main character
  if (hasMain) {
    const nicknameButton = new ButtonBuilder()
      .setCustomId(`discord_nickname_${userId}`)
      .setLabel('🏷️ Discord Nickname')
      .setStyle(ButtonStyle.Primary);

    // Row 1: Add, Edit, Nickname
    const row1 = new ActionRowBuilder().addComponents(addCharacterButton, editButton, nicknameButton);
    
    // Row 2: Remove
    const row2 = new ActionRowBuilder().addComponents(removeButton);

    return [row1, row2];
  } else {
    // No main character - show Add, Edit, Remove only
    const row1 = new ActionRowBuilder().addComponents(addCharacterButton, editButton);
    const row2 = new ActionRowBuilder().addComponents(removeButton);

    return [row1, row2];
  }
}

// Admin version (includes nickname button for managing other users)
export function adminProfileButtons(userId, hasMain = false) {
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

  // Only show Discord Nickname button if target user has a main character
  if (hasMain) {
    const nicknameButton = new ButtonBuilder()
      .setCustomId(`discord_nickname_${userId}`)
      .setLabel('🏷️ Discord Nickname')
      .setStyle(ButtonStyle.Primary);

    const row1 = new ActionRowBuilder().addComponents(addCharacterButton, editButton, nicknameButton);
    const row2 = new ActionRowBuilder().addComponents(removeButton);

    return [row1, row2];
  } else {
    // No main character - show Add, Edit, Remove only
    const row1 = new ActionRowBuilder().addComponents(addCharacterButton, editButton);
    const row2 = new ActionRowBuilder().addComponents(removeButton);

    return [row1, row2];
  }
}

export default {
  profileButtons,
  adminProfileButtons
};
