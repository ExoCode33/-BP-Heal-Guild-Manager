import { Events } from 'discord.js';
import { CharacterRepo } from '../database/repositories.js';
import logger from '../services/logger.js';
import * as classRoleService from '../services/classRoles.js';

/**
 * AUTO-CLEANUP EVENT HANDLER
 * 
 * This event fires when a member leaves the Discord server.
 * Automatically removes all character data for users who leave.
 * 
 * What gets cleaned up:
 * - All characters (main, alts, subclasses)
 * - Battle Imagines
 * - Nickname preferences
 * - Class roles (already removed by Discord)
 * 
 * @event guildMemberRemove
 */

export default {
  name: Events.GuildMemberRemove,
  
  async execute(member) {
    const userId = member.user.id;
    const username = member.user.username;
    
    console.log(`[MEMBER LEFT] ${username} (${userId}) left the server`);
    
    try {
      // Check if user has any characters
      const characters = await CharacterRepo.findAllByUser(userId);
      
      if (characters.length === 0) {
        console.log(`[MEMBER LEFT] ${username} had no characters, nothing to clean up`);
        return;
      }
      
      console.log(`[MEMBER LEFT] ${username} had ${characters.length} character(s), cleaning up...`);
      
      // Delete all characters (this also deletes battle imagines via cascade)
      for (const character of characters) {
        await CharacterRepo.delete(character.id);
        console.log(`[MEMBER LEFT] Deleted character: ${character.ign} (${character.class})`);
      }
      
      // Clean up nickname preferences
      const { NicknamePrefsRepo } = await import('../services/nickname.js');
      await NicknamePrefsRepo.set(userId, []);
      console.log(`[MEMBER LEFT] Cleared nickname preferences for ${username}`);
      
      // Log the cleanup
      logger.system(
        'Member Left',
        `Auto-cleanup: Removed ${characters.length} character(s) for ${username}`,
        { userId, characterCount: characters.length }
      );
      
      console.log(`[MEMBER LEFT] ✅ Cleanup complete for ${username}`);
      
    } catch (error) {
      console.error('[MEMBER LEFT ERROR]', error);
      logger.error(
        'Member Left',
        `Failed to clean up data for ${username}: ${error.message}`,
        error
      );
    }
  }
};
