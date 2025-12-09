import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import logger from './utils/logger.js';

// Dynamic handler imports with error handling
let handlers = {};

async function loadHandlers() {
  const handlerFiles = [
    { path: './handlers/create.js', name: 'create' },
    { path: './handlers/update.js', name: 'update' },
    { path: './handlers/addAlt.js', name: 'addAlt' },
    { path: './handlers/addSubclass.js', name: 'addSubclass' },
    { path: './handlers/character.js', name: 'character' }
  ];

  const loaded = [];
  const missing = [];

  for (const handler of handlerFiles) {
    try {
      const module = await import(handler.path);
      handlers[handler.name] = module;
      loaded.push(handler.name);
    } catch (error) {
      handlers[handler.name] = null;
      missing.push(handler.name);
    }
  }

  logger.handlers(loaded, missing);
}

// Dynamic sheets import
let syncToSheets = null;
try {
  const sheetsModule = await import('./services/sheets.js');
  syncToSheets = sheetsModule.syncToSheets;
} catch (error) {
  // Sheets service not available
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// Create Express app for health checks
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Discord bot is running!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  logger.server(PORT);
});

// Initialize logger with Discord client (will be set when bot is ready)
// This happens after bot login

// Load handlers
await loadHandlers();

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  import(filePath).then(commandModule => {
    const command = commandModule.default;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warning(`⚠️ Command at ${file} missing data/execute`);
    }
  });
}

// Register commands with Discord
async function registerCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const commandModule = await import(filePath);
    const command = commandModule.default;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    logger.commands(data.length);
  } catch (error) {
    logger.error(`❌ Command registration failed: ${error.message}`);
  }
}

// Bot ready event
client.once(Events.ClientReady, async (c) => {
  // Initialize logger with client
  logger.init(client);
  
  logger.botReady(c.user.tag);
  
  // Register commands
  await registerCommands();
  
  // Start auto-sync if configured and sheets service is available
  if (syncToSheets) {
    const autoSyncInterval = parseInt(process.env.AUTO_SYNC_INTERVAL) || 300000;
    if (autoSyncInterval > 0) {
      logger.info(`⏰ Auto-sync: every ${autoSyncInterval / 1000}s`);
      setInterval(async () => {
        try {
          logger.syncStarted();
          await syncToSheets(client);
          logger.syncComplete();
        } catch (error) {
          logger.syncFailed(error);
        }
      }, autoSyncInterval);
    }
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`❌ No command: ${interaction.commandName}`);
    return;
  }

  try {
    logger.commandExecuted(interaction.commandName, interaction.user.tag);
    await command.execute(interaction);
  } catch (error) {
    logger.commandError(interaction.commandName, error);
    
    const errorResponse = {
      content: '❌ There was an error executing this command!',
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
});

// Safe handler call helper
function safeCall(handlerName, functionName, ...args) {
  if (handlers[handlerName] && handlers[handlerName][functionName]) {
    return handlers[handlerName][functionName](...args);
  }
  return Promise.resolve();
}

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  logger.interaction('Button', customId);

  try {
    // Create character flow
    if (customId === 'create_character') {
      await safeCall('create', 'handleCreateCharacter', interaction);
    }
    
    // View character
    else if (customId.startsWith('view_character_')) {
      await safeCall('character', 'handleViewCharacter', interaction);
    }
    
    // Update handlers
    else if (customId.startsWith('update_main_')) {
      await safeCall('update', 'handleUpdateMain', interaction);
    }
    else if (customId.startsWith('update_alt_')) {
      await safeCall('update', 'handleUpdateAlt', interaction);
    }
    else if (customId.startsWith('update_subclass_')) {
      await safeCall('update', 'handleUpdateSubclass', interaction);
    }
    else if (customId.startsWith('back_to_update_menu_')) {
      await safeCall('update', 'handleBackToUpdateMenu', interaction);
    }
    else if (customId.startsWith('back_to_update_class_')) {
      await safeCall('update', 'handleBackToUpdateClass', interaction);
    }
    else if (customId.startsWith('back_to_update_timezone_region_')) {
      await safeCall('update', 'handleBackToUpdateTimezoneRegion', interaction);
    }
    else if (customId.startsWith('back_to_update_timezone_country_')) {
      await safeCall('update', 'handleBackToUpdateTimezoneCountry', interaction);
    }
    
    // Add alt character
    else if (customId.startsWith('add_alt_')) {
      await safeCall('addAlt', 'handleAddAlt', interaction);
    }
    
    // Add subclass
    else if (customId.startsWith('add_subclass_')) {
      await safeCall('addSubclass', 'handleAddSubclass', interaction);
    }
    
    // Delete handlers
    else if (customId.startsWith('delete_main_')) {
      await safeCall('character', 'handleDeleteMain', interaction);
    }
    else if (customId.startsWith('delete_alt_')) {
      await safeCall('character', 'handleDeleteAlt', interaction);
    }
    else if (customId.startsWith('delete_subclass_')) {
      await safeCall('character', 'handleDeleteSubclass', interaction);
    }
    else if (customId.startsWith('confirm_delete_main_')) {
      await safeCall('character', 'handleConfirmDeleteMain', interaction);
    }
    else if (customId.startsWith('confirm_delete_alt_')) {
      await safeCall('character', 'handleConfirmDeleteAlt', interaction);
    }
    else if (customId.startsWith('confirm_delete_subclass_')) {
      await safeCall('character', 'handleConfirmDeleteSubclass', interaction);
    }
    else if (customId.startsWith('cancel_delete_')) {
      await interaction.update({ 
        content: '❌ Deletion cancelled.', 
        embeds: [], 
        components: [] 
      });
    }
    
    // Back to menu
    else if (customId.startsWith('back_to_menu_')) {
      await safeCall('character', 'handleViewCharacter', interaction);
    }

  } catch (error) {
    logger.error(`❌ Button error (${customId}): ${error.message}`);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred while processing your request.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred while processing your request.', 
          ephemeral: true 
        });
      }
    } catch (followupError) {
      logger.error(`❌ Error sending error message: ${followupError.message}`);
    }
  }
});

// Handle select menu interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const customId = interaction.customId;
  logger.interaction('Select', customId);

  try {
    // Update option selection
    if (customId.startsWith('update_option_')) {
      await safeCall('update', 'handleUpdateOptionSelection', interaction);
    }
    // Update class selection
    else if (customId.startsWith('update_class_')) {
      await safeCall('update', 'handleUpdateClassSelection', interaction);
    }
    // Update subclass selection
    else if (customId.startsWith('update_subclass_')) {
      await safeCall('update', 'handleUpdateSubclassSelection', interaction);
    }
    // Update ability score selection
    else if (customId.startsWith('update_ability_score_select_')) {
      await safeCall('update', 'handleUpdateAbilityScoreSelection', interaction);
    }
    // Update guild selection
    else if (customId.startsWith('update_guild_')) {
      await safeCall('update', 'handleUpdateGuildSelection', interaction);
    }
    // Update timezone selections
    else if (customId.startsWith('update_timezone_region_')) {
      await safeCall('update', 'handleUpdateTimezoneRegionSelection', interaction);
    }
    else if (customId.startsWith('update_timezone_country_')) {
      await safeCall('update', 'handleUpdateTimezoneCountrySelection', interaction);
    }
    else if (customId.startsWith('update_timezone_final_')) {
      await safeCall('update', 'handleUpdateTimezoneFinalSelection', interaction);
    }
    // Select alt to update
    else if (customId.startsWith('select_alt_update_')) {
      await safeCall('update', 'handleAltSelectionForUpdate', interaction);
    }
    // Select subclass to update
    else if (customId.startsWith('select_subclass_update_')) {
      await safeCall('update', 'handleSubclassSelectionForUpdate', interaction);
    }
    // Select main or alt for subclass
    else if (customId.startsWith('select_main_or_alt_')) {
      await safeCall('addSubclass', 'handleSelectMainOrAlt', interaction);
    }
    // Select alt for subclass
    else if (customId.startsWith('select_alt_for_subclass_')) {
      await safeCall('addSubclass', 'handleSelectAltForSubclass', interaction);
    }
    // Select alt to delete
    else if (customId.startsWith('select_delete_alt_')) {
      await safeCall('character', 'handleSelectDeleteAlt', interaction);
    }
    // Select subclass to delete
    else if (customId.startsWith('select_delete_subclass_')) {
      await safeCall('character', 'handleSelectDeleteSubclass', interaction);
    }

  } catch (error) {
    logger.error(`❌ Select error (${customId}): ${error.message}`);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred while processing your selection.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred while processing your selection.', 
          ephemeral: true 
        });
      }
    } catch (followupError) {
      logger.error(`❌ Error sending error message: ${followupError.message}`);
    }
  }
});

// Handle modal submissions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const customId = interaction.customId;
  logger.interaction('Modal', customId);

  try {
    // Main character modal
    if (customId.startsWith('main_character_modal')) {
      await safeCall('create', 'handleMainCharacterModal', interaction);
    }
    // Main subclass modal
    else if (customId.startsWith('main_subclass_modal_')) {
      await safeCall('create', 'handleMainSubclassModal', interaction);
    }
    // Alt character modal
    else if (customId.startsWith('alt_character_modal_')) {
      await safeCall('addAlt', 'handleAddAltModal', interaction);
    }
    // Alt subclass modal
    else if (customId.startsWith('alt_subclass_modal_')) {
      await safeCall('addAlt', 'handleAddAltSubclassModal', interaction);
    }
    // Add subclass modal
    else if (customId.startsWith('add_subclass_modal_')) {
      await safeCall('addSubclass', 'handleAddSubclassModal', interaction);
    }
    // Update IGN modal
    else if (customId.startsWith('update_ign_modal_')) {
      await safeCall('update', 'handleUpdateModal', interaction, 'ign');
    }

  } catch (error) {
    logger.error(`❌ Modal error (${customId}): ${error.message}`);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ An error occurred while processing your submission.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ An error occurred while processing your submission.', 
          ephemeral: true 
        });
      }
    } catch (followupError) {
      logger.error(`❌ Error sending error message: ${followupError.message}`);
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  logger.error(`❌ Unhandled rejection: ${error.message}`);
});

process.on('uncaughtException', error => {
  logger.error(`❌ Uncaught exception: ${error.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.shutdown();
  server.close(() => {
    client.destroy();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.shutdown();
  server.close(() => {
    client.destroy();
    process.exit(0);
  });
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
