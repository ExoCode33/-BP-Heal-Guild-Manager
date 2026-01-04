import logger from './logger.js';
import { CharacterRepo } from '../database/repositories.js';
import db from '../database/index.js';

// ═══════════════════════════════════════════════════════════════════
// NICKNAME PREFERENCES REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const NicknamePrefsRepo = {
  async get(userId) {
    const result = await db.query(
      'SELECT nickname_preferences FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.nickname_preferences || null;
  },

  async set(userId, characterIds) {
    // Ensure user exists first
    await db.query(
      'INSERT INTO users (user_id, nickname_preferences) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET nickname_preferences = $2',
      [userId, characterIds]
    );
  },

  /**
   * Clean up orphaned character IDs from preferences
   * Removes any character IDs that no longer exist in the database
   */
  async cleanup(userId) {
    const prefs = await this.get(userId);
    if (!prefs || prefs.length === 0) return;

    // Get all valid character IDs for this user
    const characters = await CharacterRepo.findAllByUser(userId);
    const validIds = characters.map(c => c.id);

    // Filter out orphaned IDs
    const cleanedPrefs = prefs.filter(id => validIds.includes(id));

    // Update if anything changed
    if (cleanedPrefs.length !== prefs.length) {
      await this.set(userId, cleanedPrefs);
      console.log(`[NICKNAME] Cleaned up ${prefs.length - cleanedPrefs.length} orphaned preference(s)`);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// BUILD NICKNAME FROM PREFERENCES
// ═══════════════════════════════════════════════════════════════════

export async function buildNickname(userId) {
  // Clean up orphaned IDs first
  await NicknamePrefsRepo.cleanup(userId);
  
  // Get user's nickname preferences
  const prefs = await NicknamePrefsRepo.get(userId);
  
  // Get all characters
  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');
  
  if (!main) return null; // No main character, no nickname
  
  // Default: Just main character if no preferences set
  if (!prefs || prefs.length === 0) {
    return main.ign;
  }
  
  // Build nickname from preferences
  // Always ensure main is first, then add selected characters in registration order
  const selectedChars = [];
  
  // Always add main first
  selectedChars.push(main.ign);
  
  // Add other selected characters (alts/subclasses) in registration order
  for (const char of characters) {
    if (char.character_type !== 'main' && prefs.includes(char.id)) {
      selectedChars.push(char.ign);
    }
  }
  
  // Join with middle dot separator
  let nickname = selectedChars.join(' · ');
  
  // Truncate if too long (max 32 chars)
  if (nickname.length > 32) {
    nickname = nickname.substring(0, 29) + '...';
  }
  
  return nickname;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE DISCORD NICKNAME
// ═══════════════════════════════════════════════════════════════════

export async function updateNickname(client, guildId, userId, customNickname = null) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return { success: false, reason: 'Guild not found' };

    const member = await guild.members.fetch(userId);
    if (!member) return { success: false, reason: 'Member not found' };

    // Build nickname from preferences if not provided
    const nickname = customNickname || await buildNickname(userId);
    if (!nickname) return { success: false, reason: 'No main character' };

    const current = member.nickname || member.user.username;
    if (current === nickname) return { success: true };

    if (nickname.length > 32) return { success: false, reason: 'Nickname too long' };
    if (member.id === guild.ownerId) return { success: false, reason: 'Server owner' };

    const bot = guild.members.me;
    if (!bot.permissions.has('ManageNicknames')) {
      return { success: false, reason: 'Missing permission' };
    }

    if (member.roles.highest.position >= bot.roles.highest.position) {
      return { success: false, reason: 'Role hierarchy' };
    }

    await member.setNickname(nickname, 'IGN sync');
    console.log(`✅ [NICKNAME] Updated ${member.user.username} → ${nickname}`);
    return { success: true };
  } catch (e) {
    if (e.code === 50013) return { success: false, reason: 'Permission denied' };
    if (e.code === 10007) return { success: false, reason: 'Member left' };
    return { success: false, reason: e.message };
  }
}

export async function syncAllNicknames(client, guildId, mainCharacters) {
  let updated = 0, failed = 0;
  const failures = [];

  for (const char of mainCharacters) {
    const result = await updateNickname(client, guildId, char.user_id);
    if (result.success) {
      updated++;
    } else {
      failed++;
      failures.push({ userId: char.user_id, ign: char.ign, reason: result.reason });
      console.log(`⚠️  [NICKNAME] Failed to update ${char.ign}: ${result.reason}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (failed > 0) {
    console.log(`❌ [NICKNAME] ${failed} nickname(s) failed to sync:`);
    failures.forEach(f => {
      console.log(`   • ${f.ign}: ${f.reason}`);
    });
  }

  logger.nicknameSync(updated, failed);
  return { updated, failed, failures };
}
