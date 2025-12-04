import pool from './db.js';

export const queries = {
  // ==================== CHARACTER QUERIES (MAIN & ALT) ====================
  
  /**
   * Create a main or alt character
   */
  async createCharacter(characterData) {
    const { 
      discordId, 
      discordName, 
      ign, 
      role, 
      className, 
      subclass, 
      abilityScore, 
      guild, 
      characterType  // 'main' or 'alt'
    } = characterData;
    
    // If it's a main character, check if one already exists
    if (characterType === 'main') {
      const existingMain = await this.getMainCharacter(discordId);
      if (existingMain) {
        throw new Error('Main character already exists. Delete it first or use update.');
      }
    }
    
    const query = `
      INSERT INTO characters (discord_id, discord_name, ign, role, class, subclass, ability_score, guild, character_type, parent_character_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
      RETURNING *
    `;
    
    const values = [discordId, discordName, ign, role, className, subclass, abilityScore, guild, characterType];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Create a subclass for a character (main or alt)
   */
  async createSubclass(subclassData) {
    const {
      discordId,
      discordName,
      parentCharacterId,
      className,
      subclass,
      role,
      abilityScore,
      subclassType  // 'main_subclass' or 'alt_subclass'
    } = subclassData;
    
    // Get parent character to use their IGN
    const parentQuery = 'SELECT ign, guild FROM characters WHERE id = $1';
    const parentResult = await pool.query(parentQuery, [parentCharacterId]);
    
    if (parentResult.rows.length === 0) {
      throw new Error('Parent character not found');
    }
    
    const parentIGN = parentResult.rows[0].ign;
    const parentGuild = parentResult.rows[0].guild;
    
    const query = `
      INSERT INTO characters (discord_id, discord_name, ign, role, class, subclass, ability_score, guild, character_type, parent_character_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [discordId, discordName, parentIGN, role, className, subclass, abilityScore, parentGuild, subclassType, parentCharacterId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Get main character for a user
   */
  async getMainCharacter(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1 AND character_type = $2';
    const result = await pool.query(query, [discordId, 'main']);
    return result.rows[0] || null;
  },

  /**
   * Get all alt characters for a user
   */
  async getAltCharacters(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1 AND character_type = $2 ORDER BY created_at ASC';
    const result = await pool.query(query, [discordId, 'alt']);
    return result.rows;
  },

  /**
   * Get subclasses for a specific character (main or alt)
   */
  async getSubclasses(parentCharacterId) {
    const query = `
      SELECT * FROM characters 
      WHERE parent_character_id = $1 
      AND character_type IN ('main_subclass', 'alt_subclass')
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [parentCharacterId]);
    return result.rows;
  },

  /**
   * Get all characters with their subclasses (hierarchical structure)
   */
  async getAllCharactersWithSubclasses(discordId) {
    const query = `
      SELECT 
        c.*,
        p.ign as parent_ign,
        p.character_type as parent_type
      FROM characters c
      LEFT JOIN characters p ON c.parent_character_id = p.id
      WHERE c.discord_id = $1
      ORDER BY 
        CASE c.character_type 
          WHEN 'main' THEN 1 
          WHEN 'main_subclass' THEN 2 
          WHEN 'alt' THEN 3 
          WHEN 'alt_subclass' THEN 4 
        END,
        c.parent_character_id NULLS FIRST,
        c.created_at ASC
    `;
    const result = await pool.query(query, [discordId]);
    return result.rows;
  },

  /**
   * Update a character
   */
  async updateCharacter(characterId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(characterId);

    const query = `
      UPDATE characters 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Delete a character (will cascade delete subclasses)
   */
  async deleteCharacter(characterId) {
    const query = 'DELETE FROM characters WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [characterId]);
    return result.rows[0];
  },

  /**
   * Delete main character and all related data
   */
  async deleteMainCharacter(discordId) {
    const query = 'DELETE FROM characters WHERE discord_id = $1 AND character_type = $2 RETURNING *';
    const result = await pool.query(query, [discordId, 'main']);
    return result.rows[0];
  },

  /**
   * Delete a subclass
   */
  async deleteSubclass(subclassId) {
    const query = `
      DELETE FROM characters 
      WHERE id = $1 
      AND character_type IN ('main_subclass', 'alt_subclass')
      RETURNING *
    `;
    const result = await pool.query(query, [subclassId]);
    return result.rows[0];
  },

  // ==================== REPORTING QUERIES ====================

  /**
   * Get all main characters
   */
  async getAllMainCharacters() {
    const query = 'SELECT * FROM characters WHERE character_type = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, ['main']);
    return result.rows;
  },

  /**
   * Get all alt characters
   */
  async getAllAlts() {
    const query = 'SELECT * FROM characters WHERE character_type = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, ['alt']);
    return result.rows;
  },

  /**
   * Get all subclasses
   */
  async getAllSubclasses() {
    const query = `
      SELECT * FROM characters 
      WHERE character_type IN ('main_subclass', 'alt_subclass')
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Get all characters (for Google Sheets sync)
   */
  async getAllCharacters() {
    const query = `
      SELECT 
        c.*,
        p.ign as parent_ign,
        p.character_type as parent_type
      FROM characters c
      LEFT JOIN characters p ON c.parent_character_id = p.id
      ORDER BY 
        c.discord_id,
        CASE c.character_type 
          WHEN 'main' THEN 1 
          WHEN 'main_subclass' THEN 2 
          WHEN 'alt' THEN 3 
          WHEN 'alt_subclass' THEN 4 
        END,
        c.parent_character_id NULLS FIRST,
        c.created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // ==================== TIMEZONE QUERIES ====================

  async setUserTimezone(discordId, discordName, timezone) {
    const query = `
      INSERT INTO user_timezones (discord_id, discord_name, timezone)
      VALUES ($1, $2, $3)
      ON CONFLICT (discord_id)
      DO UPDATE SET
        discord_name = EXCLUDED.discord_name,
        timezone = EXCLUDED.timezone,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [discordId, discordName, timezone];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getUserTimezone(discordId) {
    const query = 'SELECT * FROM user_timezones WHERE discord_id = $1';
    const result = await pool.query(query, [discordId]);
    return result.rows[0] || null;
  },

  async deleteUserTimezone(discordId) {
    const query = 'DELETE FROM user_timezones WHERE discord_id = $1 RETURNING *';
    const result = await pool.query(query, [discordId]);
    return result.rows[0];
  },

  async getAllUserTimezones() {
    const query = 'SELECT * FROM user_timezones ORDER BY discord_name ASC';
    const result = await pool.query(query);
    return result.rows;
  },

  // ==================== UTILITY QUERIES ====================

  async initializeDatabase() {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    try {
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  },

  async getStats() {
    const mainCountQuery = 'SELECT COUNT(*) as count FROM characters WHERE character_type = $1';
    const altCountQuery = 'SELECT COUNT(*) as count FROM characters WHERE character_type = $2';
    const subclassCountQuery = `SELECT COUNT(*) as count FROM characters WHERE character_type IN ('main_subclass', 'alt_subclass')`;
    const timezoneCountQuery = 'SELECT COUNT(*) as count FROM user_timezones';
    
    const [mainResult, altResult, subclassResult, timezoneResult] = await Promise.all([
      pool.query(mainCountQuery, ['main']),
      pool.query(altCountQuery, ['alt']),
      pool.query(subclassCountQuery),
      pool.query(timezoneCountQuery)
    ]);
    
    return {
      mainCharacters: parseInt(mainResult.rows[0].count),
      altCharacters: parseInt(altResult.rows[0].count),
      subclasses: parseInt(subclassResult.rows[0].count),
      totalCharacters: parseInt(mainResult.rows[0].count) + parseInt(altResult.rows[0].count) + parseInt(subclassResult.rows[0].count),
      usersWithTimezone: parseInt(timezoneResult.rows[0].count)
    };
  }
};
