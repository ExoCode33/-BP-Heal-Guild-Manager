// src/utils/interactionHelper.js

/**
 * Safely defer an interaction to prevent "Session expired" errors
 * Call this at the START of any handler that might take time
 */
export async function safeDeferUpdate(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    try {
      await interaction.deferUpdate();
      return true;
    } catch (error) {
      console.error('[DEFER] Could not defer interaction:', error.message);
      return false;
    }
  }
  return false;
}

/**
 * Safely respond to an interaction (handles both deferred and non-deferred)
 */
export async function safeUpdate(interaction, options) {
  try {
    if (interaction.deferred) {
      await interaction.editReply(options);
    } else if (!interaction.replied) {
      await interaction.update(options);
    } else {
      await interaction.followUp({ ...options, ephemeral: true });
    }
  } catch (error) {
    console.error('[UPDATE] Could not update interaction:', error.message);
    throw error;
  }
}

/**
 * Safely reply to an interaction (handles both deferred and non-deferred)
 */
export async function safeReply(interaction, options) {
  try {
    if (interaction.deferred) {
      await interaction.editReply(options);
    } else if (!interaction.replied) {
      await interaction.reply(options);
    } else {
      await interaction.followUp(options);
    }
  } catch (error) {
    console.error('[REPLY] Could not reply to interaction:', error.message);
    throw error;
  }
}
