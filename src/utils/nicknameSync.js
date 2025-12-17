import logger from '../utils/logger.js';

/**
 * ✅ IMPROVED: Better permission checking and error handling
 * Updates a Discord member's nickname to match their main IGN
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID where to update nickname
 * @param {string} userId - User ID to update
 * @param {string} ign - In-game name to set as nickname
 * @returns {Promise<{success: boolean, reason?: string}>} - Success status and optional reason
 */
export async function updateDiscordNickname(client, guildId, userId, ign) {
  try {
    // Step 1: Fetch guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return { success: false, reason: 'Guild not found' };
    }

    // Step 2: Fetch member
    const member = await guild.members.fetch(userId);
    if (!member) {
      return { success: false, reason: 'Member not found in guild' };
    }

    // Step 3: Check if nickname is already correct
    // Note: member.displayName shows actual name visible in Discord
    // member.nickname is null if no custom nickname set
    const currentDisplayName = member.nickname || member.user.username;
    
    if (currentDisplayName === ign) {
      console.log(`[NICKNAME SYNC] ✅ Already correct: ${ign}`);
      return { success: true }; // Already correct, no need to update
    }
    
    console.log(`[NICKNAME SYNC] 🔄 Mismatch: "${currentDisplayName}" → "${ign}"`);

    // Step 4: Check if IGN is valid (not too long)
    if (ign.length > 32) {
      logger.logWarning(
        'Nickname Sync',
        `IGN too long for Discord nickname: ${ign.substring(0, 32)}...`,
        `User ID: ${userId}`
      );
      return { success: false, reason: 'IGN too long (max 32 chars)' };
    }

    // Step 5: Check if user is server owner (Discord limitation)
    if (member.id === guild.ownerId) {
      return { success: false, reason: 'Server owner (Discord limitation)' };
    }

    // ✅ NEW: Step 6: Check bot's permissions
    const botMember = guild.members.me;
    if (!botMember) {
      return { success: false, reason: 'Bot member not found' };
    }

    const botPermissions = botMember.permissions;
    if (!botPermissions.has('ManageNicknames')) {
      logger.logError(
        'Nickname Sync',
        'Bot is missing "Manage Nicknames" permission!',
        null,
        { guild: guild.name, guildId }
      );
      return { 
        success: false, 
        reason: 'Bot lacks "Manage Nicknames" permission' 
      };
    }

    // ✅ NEW: Step 7: Check role hierarchy
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return { 
        success: false, 
        reason: 'User has higher or equal role than bot' 
      };
    }

    // Step 8: Try to update nickname
    await member.setNickname(ign, 'Main character IGN sync');
    
    logger.logInfo(
      'Nickname Sync',
      `Updated nickname: ${member.user.username} → ${ign}`,
      `User ID: ${userId}`
    );
    
    return { success: true };
    
  } catch (error) {
    // Handle specific Discord API error codes
    if (error.code === 50013) { // Missing Permissions
      logger.logError(
        'Nickname Sync',
        `Permission denied when changing nickname for ${userId}`,
        error,
        { ign, userId, errorCode: error.code }
      );
      return { 
        success: false, 
        reason: 'Bot lacks permissions (user may have higher role)' 
      };
    } else if (error.code === 50035) { // Invalid form body
      logger.logWarning(
        'Nickname Sync',
        `Invalid IGN format for ${userId}: ${ign}`,
        `Error code: ${error.code}`
      );
      return { 
        success: false, 
        reason: 'Invalid IGN format' 
      };
    } else if (error.code === 10007) { // Unknown Member
      return { 
        success: false, 
        reason: 'Member not found (may have left server)' 
      };
    } else if (error.code === 10004) { // Unknown Guild
      return { 
        success: false, 
        reason: 'Guild not found' 
      };
    } else {
      // Unexpected error - log with full details
      logger.logError(
        'Nickname Sync',
        `Unexpected error updating nickname for ${userId}`,
        error,
        { ign, userId, errorCode: error.code, errorMessage: error.message }
      );
      return { 
        success: false, 
        reason: error.message 
      };
    }
  }
}

/**
 * Syncs all users' Discord nicknames with their main IGNs
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {Database} db - Database instance
 * @returns {Promise<{success: number, failed: number, failedUsers: Array}>} - Sync results
 */
export async function syncAllNicknames(client, guildId, db) {
  try {
    logger.logInfo('Nickname Sync', 'Starting bulk nickname sync for all main characters');
    
    // ✅ FIXED: Get all characters, filter to mains only
    const allChars = await db.getAllCharacters();
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    console.log(`[NICKNAME SYNC] Found ${mainChars.length} main characters to sync`);
    
    let success = 0;
    let failed = 0;
    const failedUsers = [];
    
    for (const char of mainChars) {
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      
      if (result.success) {
        success++;
        console.log(`[NICKNAME SYNC] ✅ ${char.user_id} → ${char.ign}`);
      } else {
        failed++;
        failedUsers.push({ 
          userId: char.user_id,
          ign: char.ign, 
          reason: result.reason || 'Unknown error' 
        });
        console.log(`[NICKNAME SYNC] ❌ ${char.user_id} - ${result.reason}`);
      }
      
      // Small delay to avoid rate limits (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Log comprehensive results
    await logger.logNicknameSync(mainChars.length, success, failed, failedUsers);
    
    console.log(`[NICKNAME SYNC] Complete: ${success} updated, ${failed} failed`);
    
    return { success, failed, failedUsers };
    
  } catch (error) {
    logger.logError(
      'Nickname Sync',
      'Bulk nickname sync failed',
      error
    );
    return { success: 0, failed: 0, failedUsers: [] };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
