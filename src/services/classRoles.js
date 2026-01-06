import config from '../config/index.js';
import logger from './logger.js';
import { CharacterRepo } from '../database/repositories.js';

// Store client globally
let discordClient = null;

/**
 * Initialize the class role service (required by index.js)
 */
export async function init(client) {
  discordClient = client;
  console.log('[CLASS ROLE] Service initialized');
}

/**
 * Add a class role to a user
 */
export async function addClassRole(userId, className) {
  try {
    const guild = await discordClient.guilds.fetch(config.discord.guildId);
    
    // Try to fetch the member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      if (error.message === 'Unknown Member') {
        console.log(`[CLASS ROLE] User ${userId} not in server, skipping role add for ${className}`);
        await cleanupLeftMember(userId);
        return;
      }
      throw error;
    }
    
    const classRoleId = config.classRoles?.[className];
    
    if (!classRoleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return;
    }
    
    if (member.roles.cache.has(classRoleId)) {
      console.log(`[CLASS ROLE] ${member.user.username} already has ${className} role`);
      return;
    }
    
    await member.roles.add(classRoleId);
    console.log(`[CLASS ROLE] Added ${className} role to ${member.user.username}`);
    
  } catch (error) {
    if (error.message === 'Unknown Member') {
      console.log(`[CLASS ROLE] User ${userId} left server, skipping role add for ${className}`);
      await cleanupLeftMember(userId);
    } else {
      console.error(`[CLASS ROLE] Error adding role for ${className}:`, error.message);
      logger.error('ClassRole', `Failed to add ${className} role: ${error.message}`, error);
    }
  }
}

/**
 * Remove a class role from a user
 */
export async function removeClassRole(userId, className) {
  try {
    const guild = await discordClient.guilds.fetch(config.discord.guildId);
    
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      if (error.message === 'Unknown Member') {
        console.log(`[CLASS ROLE] User ${userId} not in server, skipping role removal for ${className}`);
        await cleanupLeftMember(userId);
        return;
      }
      throw error;
    }
    
    const classRoleId = config.classRoles?.[className];
    
    if (!classRoleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return;
    }
    
    if (!member.roles.cache.has(classRoleId)) {
      console.log(`[CLASS ROLE] ${member.user.username} doesn't have ${className} role`);
      return;
    }
    
    await member.roles.remove(classRoleId);
    console.log(`[CLASS ROLE] Removed ${className} role from ${member.user.username}`);
    
  } catch (error) {
    if (error.message === 'Unknown Member') {
      console.log(`[CLASS ROLE] User ${userId} left server, skipping role removal for ${className}`);
      await cleanupLeftMember(userId);
    } else {
      console.error(`[CLASS ROLE] Error removing role for ${className}:`, error.message);
      logger.error('ClassRole', `Failed to remove ${className} role: ${error.message}`, error);
    }
  }
}

/**
 * Check if a user still uses a specific class
 */
export async function checkClassUsage(userId, className) {
  const characters = await CharacterRepo.findAllByUser(userId);
  return characters.some(c => c.class === className);
}

/**
 * Sync a user's class roles based on their characters
 * Called during startup to validate roles
 */
export async function syncUserClassRoles(userId) {
  try {
    // Get all user's characters
    const characters = await CharacterRepo.findAllByUser(userId);
    
    if (characters.length === 0) {
      console.log(`[CLASS ROLE] User ${userId} has no characters, skipping sync`);
      return { success: true, message: 'No characters' };
    }
    
    // Get all unique classes this user has
    const userClasses = [...new Set(characters.map(c => c.class))];
    
    // Try to fetch the member
    const guild = await discordClient.guilds.fetch(config.discord.guildId);
    let member;
    
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      if (error.message === 'Unknown Member') {
        console.log(`[CLASS ROLE] User ${userId} not in server during sync, cleaning up...`);
        await cleanupLeftMember(userId);
        return { success: true, message: 'User left server, cleaned up' };
      }
      throw error;
    }
    
    // Sync each class
    for (const className of userClasses) {
      const classRoleId = config.classRoles?.[className];
      
      if (!classRoleId) {
        console.log(`[CLASS ROLE] No role configured for class: ${className}`);
        continue;
      }
      
      // Add role if they don't have it
      if (!member.roles.cache.has(classRoleId)) {
        await member.roles.add(classRoleId);
        console.log(`[CLASS ROLE] Synced ${className} role for ${member.user.username}`);
      }
    }
    
    return { success: true, message: 'Roles synced' };
    
  } catch (error) {
    if (error.message === 'Unknown Member') {
      console.log(`[CLASS ROLE] User ${userId} left server during sync, cleaning up...`);
      await cleanupLeftMember(userId);
      return { success: true, message: 'User left server, cleaned up' };
    } else {
      console.error(`[CLASS ROLE] Error syncing roles for ${userId}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Clean up data for a member who left the server
 */
async function cleanupLeftMember(userId) {
  try {
    const characters = await CharacterRepo.findAllByUser(userId);
    
    if (characters.length === 0) {
      return;
    }
    
    console.log(`[CLASS ROLE] Auto-cleanup: User ${userId} left, removing ${characters.length} character(s)`);
    
    for (const character of characters) {
      await CharacterRepo.delete(character.id);
    }
    
    try {
      const db = await import('../database/index.js').then(m => m.default);
      await db.run('DELETE FROM nickname_preferences WHERE user_id = ?', [userId]);
    } catch (error) {
      // Ignore if table doesn't exist
    }
    
    console.log(`[CLASS ROLE] Auto-cleanup complete for user ${userId}`);
    
  } catch (error) {
    console.error(`[CLASS ROLE] Error during auto-cleanup for ${userId}:`, error.message);
  }
}

// Export both ways to support different import styles
export default {
  init,
  addClassRole,
  removeClassRole,
  checkClassUsage,
  syncUserClassRoles
};
