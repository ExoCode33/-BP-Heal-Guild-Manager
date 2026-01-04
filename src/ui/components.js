import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

// ═══════════════════════════════════════════════════════════════════
// PROFILE BUTTONS
// ═══════════════════════════════════════════════════════════════════

export function profileButtons(userId, hasMain) {
  const rows = [];

  // Row 1: Main actions
  const row1Components = [];

  if (hasMain) {
    row1Components.push(
      new ButtonBuilder()
        .setCustomId(`reg_subclass_${userId}`)
        .setLabel('➕ Add Subclass')
        .setStyle(ButtonStyle.Primary)
    );

    row1Components.push(
      new ButtonBuilder()
        .setCustomId(`reg_alt_${userId}`)
        .setLabel('🎮 Add Alt Character')
        .setStyle(ButtonStyle.Primary)
    );

    row1Components.push(
      new ButtonBuilder()
        .setCustomId(`edit_character_${userId}`)
        .setLabel('✏️ Edit Character')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    row1Components.push(
      new ButtonBuilder()
        .setCustomId(`reg_start_${userId}`)
        .setLabel('📝 Register Character')
        .setStyle(ButtonStyle.Success)
    );
  }

  rows.push(new ActionRowBuilder().addComponents(row1Components));

  // Row 2: Deletion actions
  if (hasMain) {
    const row2Components = [];

    row2Components.push(
      new ButtonBuilder()
        .setCustomId(`delete_character_${userId}`)
        .setLabel('🗑️ Delete Main')
        .setStyle(ButtonStyle.Danger)
    );

    row2Components.push(
      new ButtonBuilder()
        .setCustomId(`delete_alt_${userId}`)
        .setLabel('🗑️ Delete Alt')
        .setStyle(ButtonStyle.Danger)
    );

    row2Components.push(
      new ButtonBuilder()
        .setCustomId(`delete_all_data_${userId}`)
        .setLabel('💀 Delete All Data')
        .setStyle(ButtonStyle.Danger)
    );

    rows.push(new ActionRowBuilder().addComponents(row2Components));
  }

  return rows;
}

export default {
  profileButtons
};
