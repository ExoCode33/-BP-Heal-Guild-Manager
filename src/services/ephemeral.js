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

  // Map old values to new simplified ones
  if (type === 'register' || type === 'edit' || type === 'view') {
    return settings.includes('character');
  }

  return settings.includes(type);
}
