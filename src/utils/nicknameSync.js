import logger from '../utils/logger.js';

/**
 * Updates a Discord member's nickname to match their main IGN
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID where to update nickname
 * @param {string} userId - User ID to update
 * @param {string} ign - In-game name to set as nickname
 * @returns {Promise<boolean>} - Success status
 */
export async function updateDiscordNickname(client, guildId, userId, ign) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      logger.debug(`Guild ${guildId} not found for nickname sync`);
      return false;
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      logger.debug(`Member ${userId} not found in guild for nickname sync`);
      return false;
    }

    // Check if nickname is already correct
    if (member.nickname === ign) {
      return true; // Already correct, no need to update
    }

    // Check if IGN is valid (not too long)
    if (ign.length > 32) {
      logger.warn(`IGN too long for Discord nickname: ${ign.substring(0, 32)}...`);
      return false;
    }

    // Update nickname
    await member.setNickname(ign, 'Main character IGN sync');
    logger.success(`Updated nickname for ${userId}: ${ign}`);
    return true;
  } catch (error) {
    // Permission errors are common - log at debug level
    if (error.code === 50013) { // Missing Permissions
      logger.debug(`Cannot update nickname for ${userId}: Missing permissions (user may have higher role)`);
    } else if (error.code === 50035) { // Invalid form body
      logger.warn(`Cannot update nickname for ${userId}: Invalid IGN format`);
    } else {
      logger.error(`Error updating nickname for ${userId}: ${error.message}`);
    }
    return false;
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
    
    for (const char of mainChars) {
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.log(`Nickname sync complete: ${success} updated, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    logger.error(`Nickname sync error: ${error.message}`);
    return { success: 0, failed: 0 };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
