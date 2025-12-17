import logger from '../utils/logger.js';

/**
 * Updates a Discord member's nickname to match their main IGN
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID where to update nickname
 * @param {string} userId - User ID to update
 * @param {string} ign - In-game name to set as nickname
 * @returns {Promise<{success: boolean, reason?: string}>} - Success status and optional reason
 */
export async function updateDiscordNickname(client, guildId, userId, ign) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return { success: false, reason: 'Guild not found' };
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      return { success: false, reason: 'Member not found in guild' };
    }

    // Check if nickname is already correct
    if (member.nickname === ign) {
      return { success: true }; // Already correct, no need to update
    }

    // Check if IGN is valid (not too long)
    if (ign.length > 32) {
      logger.warn(`IGN too long for Discord nickname: ${ign.substring(0, 32)}...`);
      return { success: false, reason: 'IGN too long (max 32 chars)' };
    }

    // Check if user is server owner (Discord limitation)
    if (member.id === guild.ownerId) {
      return { success: false, reason: 'Server owner (Discord limitation)' };
    }

    // Try to update nickname - attempt even for admins
    await member.setNickname(ign, 'Main character IGN sync');
    logger.success(`Updated nickname: ${ign} (${userId})`);
    return { success: true };
  } catch (error) {
    // Handle specific error codes
    if (error.code === 50013) { // Missing Permissions
      return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
    } else if (error.code === 50035) { // Invalid form body
      logger.warn(`Invalid IGN format for ${userId}: ${ign}`);
      return { success: false, reason: 'Invalid IGN format' };
    } else {
      logger.error(`Error updating nickname for ${userId}: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }
}

/**
 * Syncs all users' Discord nicknames with their main IGNs
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {Database} db - Database instance
 * @returns {Promise<{success: number, failed: number}>} - Sync results
 */
export async function syncAllNicknames(client, guildId, db) {
  try {
    logger.log('Starting nickname sync for all users...');
    
    // Get all main characters
    const allChars = await db.getAllCharacters();
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    let success = 0;
    let failed = 0;
    const successList = [];
    const failedList = [];
    
    for (const char of mainChars) {
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      if (result.success) {
        success++;
        successList.push({ ign: char.ign, userId: char.user_id });
      } else {
        failed++;
        failedList.push({ 
          ign: char.ign, 
          userId: char.user_id, 
          reason: result.reason || 'Unknown error' 
        });
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Log results with details
    if (failed > 0) {
      logger.warn(`⚠️ Nickname sync failed for ${failed} user${failed > 1 ? 's' : ''}:`);
      failedList.forEach(user => {
        logger.warn(`   ${user.userId} - ${user.reason}`);
      });
    }
    
    logger.log(`Nickname sync complete: ${success} updated, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    logger.error(`Nickname sync error: ${error.message}`);
    return { success: 0, failed: 0 };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
