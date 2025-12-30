import { EphemeralRepo } from '../database/repositories.js';

const cache = new Map();

/**
 * Check if a specific interaction type should be ephemeral
 * @param {string} guildId - Discord guild ID
 * @param {string} type - Interaction type to check
 * @returns {Promise<boolean>} True if should be ephemeral
 */
export async function isEphemeral(guildId, type) {
  if (!guildId) return true;

  let settings = cache.get(guildId);
  if (!settings) {
    settings = await EphemeralRepo.get(guildId);
    cache.set(guildId, settings);
    setTimeout(() => cache.delete(guildId), 60000);
  }

  // ═══════════════════════════════════════════════════════════
  // COMMAND EPHEMERAL CHECKS
  // ═══════════════════════════════════════════════════════════
  
  // /edit-character command
  if (type === 'edit_character') {
    return settings.includes('edit_character');
  }
  
  // /view-character command
  if (type === 'view_character') {
    return settings.includes('view_character');
  }
  
  // /admin command
  if (type === 'admin') {
    return settings.includes('admin');
  }

  // ═══════════════════════════════════════════════════════════
  // FLOW EPHEMERAL CHECKS
  // ═══════════════════════════════════════════════════════════
  
  // Registration flow
  if (type === 'registration' || type === 'register') {
    return settings.includes('registration');
  }
  
  // Edit actions (buttons)
  if (type === 'edit' || type === 'editing') {
    return settings.includes('edit_actions');
  }
  
  // Add character/subclass
  if (type === 'add' || type === 'adding') {
    return settings.includes('add_character');
  }
  
  // Delete character
  if (type === 'delete' || type === 'deletion' || type === 'remove') {
    return settings.includes('delete_character');
  }
  
  // Error messages
  if (type === 'error' || type === 'errors') {
    return settings.includes('errors');
  }

  // Default: not ephemeral
  return false;
}

/**
 * Clear the cache for a specific guild
 * @param {string} guildId - Discord guild ID
 */
export function clearCache(guildId) {
  if (guildId) {
    cache.delete(guildId);
  } else {
    cache.clear();
  }
}
