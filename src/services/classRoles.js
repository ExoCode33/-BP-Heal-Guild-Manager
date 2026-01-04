import config from '../config/index.js';
import { CLASSES } from '../config/game.js';
import logger from './logger.js';

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getClassRoleId(className) {
  if (!className) return null;
  return config.classRoles?.[className] || null;
}

function getRole(className) {
  return CLASSES[className]?.role || 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════
// CLASS ROLE MANAGEMENT SERVICE
// ═══════════════════════════════════════════════════════════════════

/**
 * Add a class role to a user
 * @param {string} userId - Discord user ID
 * @param {string} className - Class name
 */
export async function addClassRole(userId, className) {
  try {
    const roleId = getClassRoleId(className);
    
    if (!roleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return { success: false, reason: 'No role configured' };
    }

    const client = global.discordClient;
    if (!client) {
      console.error('[CLASS ROLE] Discord client not available');
      return { success: false, reason: 'Client not available' };
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    const role = await guild.roles.fetch(roleId);

    if (!role) {
      console.error(`[CLASS ROLE] Role not found: ${roleId} for class ${className}`);
      return { success: false, reason: 'Role not found' };
    }

    if (member.roles.cache.has(roleId)) {
      console.log(`[CLASS ROLE] User already has role ${className}`);
      return { success: true, reason: 'Already has role' };
    }

    await member.roles.add(role);
    console.log(`✅ [CLASS ROLE] Assigned ${className} role to ${member.user.username}`);
    logger.info('ClassRole', `Assigned ${className} to ${member.user.username}`);

    return { success: true };

  } catch (error) {
    console.error(`[CLASS ROLE] Error adding role for ${className}:`, error.message);
    logger.error('ClassRole', `Failed to add ${className} role: ${error.message}`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Remove a class role from a user
 * @param {string} userId - Discord user ID
 * @param {string} className - Class name
 */
export async function removeClassRole(userId, className) {
  try {
    const roleId = getClassRoleId(className);
    
    if (!roleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return { success: false, reason: 'No role configured' };
    }

    const client = global.discordClient;
    if (!client) {
      console.error('[CLASS ROLE] Discord client not available');
      return { success: false, reason: 'Client not available' };
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    const role = await guild.roles.fetch(roleId);

    if (!role) {
      console.error(`[CLASS ROLE] Role not found: ${roleId} for class ${className}`);
      return { success: false, reason: 'Role not found' };
    }

    if (!member.roles.cache.has(roleId)) {
      console.log(`[CLASS ROLE] User doesn't have role ${className}`);
      return { success: true, reason: 'Already removed' };
    }

    await member.roles.remove(role);
    console.log(`✅ [CLASS ROLE] Removed ${className} role from ${member.user.username}`);
    logger.info('ClassRole', `Removed ${className} from ${member.user.username}`);

    return { success: true };

  } catch (error) {
    console.error(`[CLASS ROLE] Error removing role for ${className}:`, error.message);
    logger.error('ClassRole', `Failed to remove ${className} role: ${error.message}`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Sync all class roles for a user based on their characters
 * @param {string} userId - Discord user ID
 * @param {Array} characters - User's characters
 */
export async function syncUserClassRoles(userId, characters) {
  try {
    const userClasses = new Set(characters.map(c => c.class));
    const results = { success: true, rolesAdded: 0, rolesRemoved: 0 };

    // Add roles for classes the user has
    for (const className of userClasses) {
      const result = await addClassRole(userId, className);
      if (result.success && result.reason !== 'Already has role') {
        results.rolesAdded++;
      }
    }

    // Remove roles for classes the user doesn't have
    const allClasses = Object.keys(CLASSES);
    for (const className of allClasses) {
      if (!userClasses.has(className)) {
        const result = await removeClassRole(userId, className);
        if (result.success && result.reason !== 'Already removed') {
          results.rolesRemoved++;
        }
      }
    }

    return results;

  } catch (error) {
    console.error('[CLASS ROLE] Error syncing roles:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize class role system
 */
export function init(client) {
  global.discordClient = client;
  console.log('✅ Class role service initialized');
}

export default {
  addClassRole,
  removeClassRole,
  syncUserClassRoles,
  init
};
