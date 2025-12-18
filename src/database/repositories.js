import db from './index.js';
import { CLASSES } from '../config/game.js';

const getRole = (className) => CLASSES[className]?.role || 'Unknown';

export const CharacterRepo = {
  async create(data) {
    const { userId, ign, uid, className, subclass, abilityScore, guild, characterType, parentId } = data;
    const result = await db.query(
      `INSERT INTO characters (user_id, ign, uid, class, subclass, ability_score, guild, character_type, parent_character_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, ign, uid, className, subclass, abilityScore, guild, characterType, parentId || null]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(`SELECT * FROM characters WHERE id = $1`, [id]);
    if (result.rows[0]) {
      result.rows[0].role = getRole(result.rows[0].class);
    }
    return result.rows[0] || null;
  },

  async findMain(userId) {
    const result = await db.query(
      `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'main'`,
      [userId]
    );
    if (result.rows[0]) {
      result.rows[0].role = getRole(result.rows[0].class);
    }
    return result.rows[0] || null;
  },

  async findAlts(userId) {
    const result = await db.query(
      `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'alt' ORDER BY created_at`,
      [userId]
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async findAllByUser(userId) {
    const result = await db.query(
      `SELECT c.*, p.ign as parent_ign
       FROM characters c
       LEFT JOIN characters p ON c.parent_character_id = p.id
       WHERE c.user_id = $1
       ORDER BY 
         CASE c.character_type WHEN 'main' THEN 1 WHEN 'main_subclass' THEN 2 WHEN 'alt' THEN 3 ELSE 4 END,
         c.created_at`,
      [userId]
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async findAll() {
    const result = await db.query(
      `SELECT c.*, p.ign as parent_ign
       FROM characters c
       LEFT JOIN characters p ON c.parent_character_id = p.id
       ORDER BY c.user_id, c.created_at`
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let i = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        const dbKey = key === 'className' ? 'class' : key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${i}`);
        values.push(val);
        i++;
      }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE characters SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await db.query(`DELETE FROM characters WHERE id = $1`, [id]);
  },

  async deleteAllByUser(userId) {
    await db.query(`DELETE FROM characters WHERE user_id = $1`, [userId]);
  },

  async countSubclasses(userId) {
    const result = await db.query(
      `SELECT COUNT(*) FROM characters WHERE user_id = $1 AND character_type IN ('main_subclass', 'alt_subclass')`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
};

export const TimezoneRepo = {
  async get(userId) {
    const result = await db.query(`SELECT timezone FROM user_timezones WHERE user_id = $1`, [userId]);
    return result.rows[0]?.timezone || null;
  },

  async set(userId, timezone) {
    await db.query(
      `INSERT INTO user_timezones (user_id, timezone) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = NOW()`,
      [userId, timezone]
    );
  }
};

export const BattleImagineRepo = {
  async add(characterId, name, tier) {
    await db.query(
      `INSERT INTO battle_imagines (character_id, imagine_name, tier) VALUES ($1, $2, $3)
       ON CONFLICT (character_id, imagine_name) DO UPDATE SET tier = $3`,
      [characterId, name, tier]
    );
  },

  async findByCharacter(characterId) {
    const result = await db.query(
      `SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY id`,
      [characterId]
    );
    return result.rows;
  },

  async deleteByCharacter(characterId) {
    await db.query(`DELETE FROM battle_imagines WHERE character_id = $1`, [characterId]);
  },

  async deleteByCharacterAndName(characterId, imagineName) {
    await db.query(
      `DELETE FROM battle_imagines WHERE character_id = $1 AND imagine_name = $2`,
      [characterId, imagineName]
    );
  }
};

export const LogSettingsRepo = {
  async get(guildId) {
    const result = await db.query(`SELECT * FROM log_settings WHERE guild_id = $1`, [guildId]);
    return result.rows[0] || null;
  },

  async upsert(guildId, data) {
    const { enabledCategories, pingRoleId, pingOnError } = data;
    await db.query(
      `INSERT INTO log_settings (guild_id, enabled_categories, ping_role_id, ping_on_error)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id) DO UPDATE SET
         enabled_categories = COALESCE($2, log_settings.enabled_categories),
         ping_role_id = COALESCE($3, log_settings.ping_role_id),
         ping_on_error = COALESCE($4, log_settings.ping_on_error),
         updated_at = NOW()`,
      [guildId, enabledCategories, pingRoleId, pingOnError]
    );
  }
};

export const EphemeralRepo = {
  async get(guildId) {
    const result = await db.query(`SELECT ephemeral_commands FROM ephemeral_settings WHERE guild_id = $1`, [guildId]);
    return result.rows[0]?.ephemeral_commands || ['register', 'edit', 'admin'];
  },

  async set(guildId, commands) {
    await db.query(
      `INSERT INTO ephemeral_settings (guild_id, ephemeral_commands) VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE SET ephemeral_commands = $2, updated_at = NOW()`,
      [guildId, commands]
    );
  }
};
