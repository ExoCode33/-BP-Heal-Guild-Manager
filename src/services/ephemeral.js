import { EphemeralRepo } from '../database/repositories.js';

const cache = new Map();

export async function isEphemeral(guildId, type) {
  if (!guildId) return true;

  let settings = cache.get(guildId);
  if (!settings) {
    settings = await EphemeralRepo.get(guildId);
    cache.set(guildId, settings);
    setTimeout(() => cache.delete(guildId), 60000);
  }

  // ✅ COMPREHENSIVE EPHEMERAL MAPPING
  
  // Character viewing
  if (type === 'character_own' || type === 'character') {
    return settings.includes('character_own');
  }
  
  if (type === 'character_view') {
    return settings.includes('character_view');
  }
  
  // Registration flow
  if (type === 'register' || type === 'registration') {
    return settings.includes('registration');
  }
  
  // Editing
  if (type === 'edit' || type === 'editing') {
    return settings.includes('edit');
  }
  
  // Adding
  if (type === 'add' || type === 'adding') {
    return settings.includes('add');
  }
  
  // Deleting
  if (type === 'delete' || type === 'deletion' || type === 'remove') {
    return settings.includes('delete');
  }
  
  // Admin commands
  if (type === 'admin') {
    return settings.includes('admin');
  }
  
  // Errors
  if (type === 'error' || type === 'errors') {
    return settings.includes('errors');
  }
  
  // Legacy compatibility - map old "character" to new "character_own"
  if (settings.includes('character') && !settings.includes('character_own')) {
    return true; // Old setting = ephemeral
  }

  return false;
}
