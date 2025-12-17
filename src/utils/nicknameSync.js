import logger from '../utils/logger.js';

/**
 * Updates a Discord member's nickname to match their main IGN
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID where to update nickname
 * @param {string} userId - User ID to update
 * @param {string} ign - In-game name to set as nickname
 * @returns {Promise<{success: boolean, reason?: string, skipped?: boolean}>} - Success status and optional reason
 */
export async function updateDiscordNickname(client, guildId, userId, ign) {
  try {
    console.log(`\n${'█'.repeat(80)}`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC] Starting sync for user ${userId}`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC] Target IGN: "${ign}"`);
    console.log(`${'█'.repeat(80)}`);
    
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Guild not found: ${guildId}`);
      return { success: false, reason: 'Guild not found' };
    }
    console.log(`[NICKNAME SYNC DIAGNOSTIC] ✅ Guild found: ${guild.name}`);

    const member = await guild.members.fetch(userId);
    if (!member) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Member not found in guild`);
      return { success: false, reason: 'Member not found in guild' };
    }
    
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] MEMBER DETAILS:`);
    console.log(`  - Discord Username: "${member.user.username}"`);
    console.log(`  - Server Nickname (member.nickname): ${member.nickname === null ? 'null (NOT SET)' : `"${member.nickname}"`}`);
    console.log(`  - Display Name: "${member.displayName}"`);
    console.log(`  - Target IGN: "${ign}"`);
    
    console.log(`\n[STRING COMPARISON] Comparing member.nickname vs ign:`);
    console.log(`  member.nickname: "${member.nickname}" (type: ${typeof member.nickname}, length: ${member.nickname?.length || 'N/A'})`);
    console.log(`  ign: "${ign}" (type: ${typeof ign}, length: ${ign.length})`);
    console.log(`  Char codes for ign: [${Array.from(ign).map(c => c.charCodeAt(0)).join(', ')}]`);
    
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] SKIP CHECK:`);
    console.log(`  - member.nickname !== null? ${member.nickname !== null}`);
    console.log(`  - member.nickname === ign? ${member.nickname === ign}`);
    console.log(`  - shouldSkip? ${member.nickname !== null && member.nickname === ign}`);
    
    // ✅ CRITICAL FIX: Only skip if nickname is ALREADY SET and matches
    if (member.nickname !== null && member.nickname === ign) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ⏭️ SKIPPING - Nickname is already correct`);
      console.log(`${'█'.repeat(80)}\n`);
      return { success: true, skipped: true };
    }

    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] 🔄 NICKNAME NEEDS UPDATE!`);
    if (member.nickname === null) {
      console.log(`  Reason: Server nickname is NOT SET (null)`);
      console.log(`  Action: Will set nickname from null to "${ign}"`);
    } else {
      console.log(`  Reason: Current nickname "${member.nickname}" doesn't match IGN "${ign}"`);
      console.log(`  Action: Will change nickname from "${member.nickname}" to "${ign}"`);
    }

    // Check if IGN is valid (not too long)
    if (ign.length > 32) {
      console.log(`\n[NICKNAME SYNC DIAGNOSTIC] ❌ IGN TOO LONG: ${ign.length} chars (max 32)`);
      console.log(`${'█'.repeat(80)}\n`);
      logger.logWarning('Nickname Sync', `IGN too long for Discord nickname: ${ign.substring(0, 32)}...`);
      return { success: false, reason: 'IGN too long (max 32 chars)' };
    }

    // Check if user is server owner (Discord limitation)
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] OWNER CHECK:`);
    console.log(`  - Guild Owner ID: ${guild.ownerId}`);
    console.log(`  - User ID: ${member.id}`);
    console.log(`  - Is Owner? ${member.id === guild.ownerId}`);
    
    if (member.id === guild.ownerId) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ USER IS SERVER OWNER (Cannot change owner nickname)`);
      console.log(`${'█'.repeat(80)}\n`);
      return { success: false, reason: 'Server owner (Discord limitation)' };
    }

    // Check bot permissions
    const botMember = await guild.members.fetch(client.user.id);
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] PERMISSION CHECK:`);
    console.log(`  - Bot has MANAGE_NICKNAMES? ${botMember.permissions.has('ManageNicknames')}`);
    console.log(`  - Bot highest role: "${botMember.roles.highest.name}" (position: ${botMember.roles.highest.position})`);
    console.log(`  - User highest role: "${member.roles.highest.name}" (position: ${member.roles.highest.position})`);
    console.log(`  - Bot position > User position? ${botMember.roles.highest.position > member.roles.highest.position}`);
    
    if (!botMember.permissions.has('ManageNicknames')) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ BOT LACKS MANAGE_NICKNAMES PERMISSION`);
      console.log(`${'█'.repeat(80)}\n`);
      return { success: false, reason: 'Bot lacks MANAGE_NICKNAMES permission' };
    }

    if (botMember.roles.highest.position <= member.roles.highest.position) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ BOT ROLE NOT HIGH ENOUGH`);
      console.log(`  Bot needs to be ABOVE user in role hierarchy`);
      console.log(`  Current: Bot (${botMember.roles.highest.position}) <= User (${member.roles.highest.position})`);
      console.log(`${'█'.repeat(80)}\n`);
      return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
    }

    // ✅ Try to update nickname
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] 🔧 ATTEMPTING TO SET NICKNAME...`);
    console.log(`  Old: ${member.nickname === null ? 'null (not set)' : `"${member.nickname}"`}`);
    console.log(`  New: "${ign}"`);
    
    await member.setNickname(ign, 'Main character IGN sync');
    
    // Verify the change
    const updatedMember = await guild.members.fetch(userId);
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] ✅✅✅ SUCCESS! Nickname updated to "${updatedMember.nickname}"`);
    console.log(`  Verification: member.nickname is now "${updatedMember.nickname}"`);
    console.log(`${'█'.repeat(80)}\n`);
    
    logger.logSuccess(`Updated nickname: ${member.user.username} → ${ign}`);
    return { success: true };
    
  } catch (error) {
    console.log(`\n[NICKNAME SYNC DIAGNOSTIC] ❌❌❌ ERROR OCCURRED!`);
    console.log(`  Error name: ${error.name}`);
    console.log(`  Error code: ${error.code}`);
    console.log(`  Error message: ${error.message}`);
    console.log(`  Stack trace:`);
    console.log(error.stack);
    console.log(`${'█'.repeat(80)}\n`);
    
    // Handle specific error codes
    if (error.code === 50013) { // Missing Permissions
      return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
    } else if (error.code === 50035) { // Invalid form body
      logger.logWarning('Nickname Sync', `Invalid IGN format for ${userId}: ${ign}`);
      return { success: false, reason: 'Invalid IGN format' };
    } else if (error.code === 10007) { // Unknown Member
      return { success: false, reason: 'Member not in server' };
    } else {
      logger.logError('Nickname Sync', `Error updating nickname for ${userId}: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }
}

/**
 * Syncs all users' Discord nicknames with their main IGNs
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {Database} db - Database instance
 * @returns {Promise<{success: number, failed: number, skipped: number}>} - Sync results
 */
export async function syncAllNicknames(client, guildId, db) {
  try {
    console.log('\n' + '█'.repeat(80));
    console.log('[NICKNAME SYNC] Starting nickname sync for ALL users...');
    console.log('█'.repeat(80));
    
    logger.logInfo('Starting nickname sync for all users...');
    
    // Get all characters
    const allChars = await db.getAllCharacters();
    console.log(`\n[NICKNAME SYNC] Database query returned ${allChars.length} total characters`);
    
    // Filter for MAIN characters only
    const mainChars = allChars.filter(c => c.character_type === 'main');
    console.log(`[NICKNAME SYNC] Filtered to ${mainChars.length} MAIN characters`);
    
    if (mainChars.length === 0) {
      console.log(`[NICKNAME SYNC] ⚠️ No main characters found in database`);
      console.log('█'.repeat(80) + '\n');
      logger.logWarning('Nickname Sync', 'No main characters found in database');
      return { success: 0, failed: 0, skipped: 0 };
    }
    
    console.log(`\n[NICKNAME SYNC] Main characters to process:`);
    mainChars.forEach((char, index) => {
      console.log(`  ${index + 1}. User: ${char.user_id} | IGN: "${char.ign}" | Type: ${char.character_type}`);
    });
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const failedList = [];
    
    for (const char of mainChars) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`[NICKNAME SYNC] Processing character ${success + failed + skipped + 1}/${mainChars.length}`);
      console.log(`  User ID: ${char.user_id}`);
      console.log(`  IGN: "${char.ign}"`);
      console.log(`  Character Type: ${char.character_type}`);
      
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      
      if (result.success) {
        if (result.skipped) {
          skipped++;
          console.log(`[NICKNAME SYNC] ✅ Result: SKIPPED (already correct)`);
        } else {
          success++;
          console.log(`[NICKNAME SYNC] ✅ Result: SUCCESS (updated)`);
        }
      } else {
        failed++;
        failedList.push({ 
          ign: char.ign, 
          userId: char.user_id, 
          reason: result.reason || 'Unknown error' 
        });
        console.log(`[NICKNAME SYNC] ❌ Result: FAILED (${result.reason})`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Log summary
    console.log('\n' + '█'.repeat(80));
    console.log(`[NICKNAME SYNC] ✅ SYNC COMPLETE`);
    console.log(`  Total processed: ${mainChars.length}`);
    console.log(`  ✅ Updated: ${success}`);
    console.log(`  ⏭️ Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log(`\n[NICKNAME SYNC] Failed users:`);
      failedList.forEach(u => {
        console.log(`  ❌ ${u.userId} (${u.ign}): ${u.reason}`);
      });
      logger.logWarning('Nickname Sync', `Failed to sync ${failed} user${failed > 1 ? 's' : ''}`, 
        failedList.map(u => `${u.userId}: ${u.reason}`).join(', '));
    }
    
    console.log('█'.repeat(80) + '\n');
    
    logger.logInfo(`Nickname sync complete: ${success} updated, ${skipped} skipped, ${failed} failed`);
    return { success, failed, skipped };
    
  } catch (error) {
    console.error('\n' + '█'.repeat(80));
    console.error(`[NICKNAME SYNC] ❌ FATAL ERROR`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    console.error('█'.repeat(80) + '\n');
    logger.logError('Nickname Sync', `Nickname sync error: ${error.message}`);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
