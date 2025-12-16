/**
 * Configuration Loader
 * 
 * Centralized configuration management system.
 * Loads all configuration once at startup and caches in memory.
 * 
 * Features:
 * - Single load at startup
 * - Memory-efficient caching
 * - Fast access
 * - Validation support
 */

class ConfigLoader {
  constructor() {
    this.config = null;
    this.gameData = null;
    this.isLoaded = false;
  }

  /**
   * Load all configuration files
   */
  async load() {
    if (this.isLoaded) {
      console.log('[CONFIG LOADER] Already loaded, using cached config');
      return;
    }

    console.log('[CONFIG LOADER] Loading configuration...');
    
    try {
      // Dynamic imports
      const [configModule, gameDataModule] = await Promise.all([
        import('../config/config.js'),
        import('../config/gameData.js')
      ]);
      
      this.config = configModule.default;
      this.gameData = gameDataModule.default;
      
      this.isLoaded = true;
      
      console.log('[CONFIG LOADER] ✓ Configuration loaded successfully');
      this.logConfigSummary();
      
    } catch (error) {
      console.error('[CONFIG LOADER] ✗ Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Get main config
   */
  getConfig() {
    if (!this.isLoaded) {
      throw new Error('Config not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Get game data
   */
  getGameData() {
    if (!this.isLoaded) {
      throw new Error('Config not loaded. Call load() first.');
    }
    return this.gameData;
  }

  /**
   * Get specific config value
   */
  get(path) {
    const parts = path.split('.');
    let value = this.config;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  /**
   * Get battle imagines
   */
  getBattleImagines() {
    return this.config?.battleImagines || [];
  }

  /**
   * Get guilds
   */
  getGuilds() {
    return this.config?.guilds || [];
  }

  /**
   * Get ephemeral settings
   */
  getEphemeralSettings() {
    return this.config?.ephemeral || {};
  }

  /**
   * Get classes
   */
  getClasses() {
    return this.gameData?.classes || [];
  }

  /**
   * Get servers by region
   */
  getServersByRegion(region) {
    return this.gameData?.servers?.[region] || [];
  }

  /**
   * Get all servers
   */
  getAllServers() {
    const servers = this.gameData?.servers || {};
    return Object.values(servers).flat();
  }

  /**
   * Get timezones
   */
  getTimezones() {
    return this.gameData?.timezones || [];
  }

  /**
   * Get tier limits
   */
  getTierLimits() {
    return this.gameData?.tierLimits || {};
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];
    
    // Check required config fields
    if (!this.config?.battleImagines || this.config.battleImagines.length === 0) {
      errors.push('No battle imagines configured');
    }
    
    if (!this.config?.guilds || this.config.guilds.length === 0) {
      errors.push('No guilds configured');
    }
    
    // Check required game data fields
    if (!this.gameData?.classes || this.gameData.classes.length === 0) {
      errors.push('No classes configured');
    }
    
    if (!this.gameData?.servers) {
      errors.push('No servers configured');
    }
    
    if (!this.gameData?.timezones || this.gameData.timezones.length === 0) {
      errors.push('No timezones configured');
    }
    
    if (errors.length > 0) {
      console.error('[CONFIG LOADER] Validation errors:');
      errors.forEach(err => console.error(`  - ${err}`));
      return false;
    }
    
    console.log('[CONFIG LOADER] ✓ Configuration validation passed');
    return true;
  }

  /**
   * Reload configuration (useful for hot-reloading in dev)
   */
  async reload() {
    console.log('[CONFIG LOADER] Reloading configuration...');
    this.isLoaded = false;
    this.config = null;
    this.gameData = null;
    await this.load();
  }

  /**
   * Log configuration summary
   */
  logConfigSummary() {
    console.log('[CONFIG LOADER] Configuration Summary:');
    console.log(`  - Battle Imagines: ${this.config?.battleImagines?.length || 0}`);
    console.log(`  - Guilds: ${this.config?.guilds?.length || 0}`);
    console.log(`  - Classes: ${this.gameData?.classes?.length || 0}`);
    console.log(`  - Server Regions: ${Object.keys(this.gameData?.servers || {}).length}`);
    console.log(`  - Timezones: ${this.gameData?.timezones?.length || 0}`);
  }

  /**
   * Get configuration as JSON (for debugging)
   */
  toJSON() {
    return {
      config: this.config,
      gameData: this.gameData,
      isLoaded: this.isLoaded
    };
  }

  /**
   * Check if config is loaded
   */
  isReady() {
    return this.isLoaded;
  }
}

// Export singleton instance
const configLoader = new ConfigLoader();

export default configLoader;

/**
 * Usage Example:
 * 
 * // In index.js (startup)
 * import configLoader from './utils/configLoader.js';
 * await configLoader.load();
 * 
 * // In any other file
 * import configLoader from './utils/configLoader.js';
 * const imagines = configLoader.getBattleImagines();
 * const classes = configLoader.getClasses();
 */
