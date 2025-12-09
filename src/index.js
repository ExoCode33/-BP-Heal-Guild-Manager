import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Import handlers
import { handleCreateCharacter, handleMainCharacterModal, handleMainSubclassModal } from './handlers/create.js';
import { handleUpdateMain, handleUpdateAlt, handleUpdateSubclass, handleAltSelectionForUpdate, handleSubclassSelectionForUpdate, handleUpdateOptionSelection, handleUpdateModal, handleUpdateClassSelection, handleUpdateSubclassSelection, handleUpdateAbilityScoreSelection, handleUpdateGuildSelection, handleUpdateTimezoneRegionSelection, handleUpdateTimezoneCountrySelection, handleUpdateTimezoneFinalSelection, handleBackToUpdateMenu, handleBackToUpdateClass, handleBackToUpdateTimezoneRegion, handleBackToUpdateTimezoneCountry } from './handlers/update.js';
import { handleAddAlt, handleAddAltModal, handleAddAltSubclassModal } from './handlers/addAlt.js';
import { handleAddSubclass, handleSelectMainOrAlt, handleSelectAltForSubclass, handleAddSubclassModal } from './handlers/addSubclass.js';
import { handleViewCharacter, handleDeleteMain, handleDeleteAlt, handleDeleteSubclass, handleSelectDeleteAlt, handleSelectDeleteSubclass, handleConfirmDeleteMain, handleConfirmDeleteAlt, handleConfirmDeleteSubclass } from './handlers/character.js';
import { syncToSheets } from './services/sheets.js';

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
  console.log(`✅ Express server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// ============================================
// DISCORD LOGGING FEATURE
// ============================================
async function logToDiscord(message, level = 'INFO') {
  if (!process.env.LOG_CHANNEL_ID) return;
  
  try {
    const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (!channel) return;
    
    const colors = {
      'INFO': '🔵',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'SYNC': '🔄'
    };
    
    const icon = colors[level] || '📝';
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    await channel.send(`${icon} **[${level}]** ${timestamp}\n\`\`\`${message}\`\`\``);
  } catch (error) {
    // Silently fail to avoid log loops
  }
}

// Override console.log for Railway logging to Discord
if (process.env.LOG_CHANNEL_ID) {
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = function(...args) {
    originalLog.apply(console, args);
    const message = args.join(' ');
    
    // Detect log level from message content
    if (message.includes('✅')) logToDiscord(message, 'SUCCESS');
    else if (message.includes('🔄')) logToDiscord(message, 'SYNC');
    else if (message.includes('⏰')) logToDiscord(message, 'SYNC');
    else logToDiscord(message, 'INFO');
  };
  
  console.error = function(...args) {
    originalError.apply(console, args);
    logToDiscord(args.join(' '), 'ERROR');
  };
  
  console.log('📡 Discord logging enabled - Railway logs will appear in Discord');
}
// ============================================

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
      console.log(`⚠️ Warning: Command at ${filePath} is missing required "data" or "execute" property.`);
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
    console.log(`🔄 Registering ${commands.length} slash commands...`);
    
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log(`✅ Successfully registered ${data.length} slash commands!`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Bot ready event
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Discord bot logged in as ${c.user.tag}`);
  
  // Register commands
  await registerCommands();
  
  // Start auto-sync if configured
  const autoSyncInterval = parseInt(process.env.AUTO_SYNC_INTERVAL) || 300000; // Default 5 minutes
  if (autoSyncInterval > 0) {
    console.log(`⏰ Auto-sync enabled: every ${autoSyncInterval / 1000} seconds`);
    setInterval(async () => {
      try {
        console.log('⏰ Auto-sync started - Syncing to Google Sheets...');
        await syncToSheets(client);
        console.log('✅ Auto-sync completed successfully');
      } catch (error) {
        console.error('❌ Auto-sync failed:', error);
      }
    }, autoSyncInterval);
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    
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

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  try {
    // Create character flow
    if (customId === 'create_character') {
      await handleCreateCharacter(interaction);
    }
    
    // View character
    else if (customId.startsWith('view_character_')) {
      await handleViewCharacter(interaction);
    }
    
    // Update handlers
    else if (customId.startsWith('update_main_')) {
      await handleUpdateMain(interaction);
    }
    else if (customId.startsWith('update_alt_')) {
      await handleUpdateAlt(interaction);
    }
    else if (customId.startsWith('update_subclass_')) {
      await handleUpdateSubclass(interaction);
    }
    else if (customId.startsWith('back_to_update_menu_')) {
      await handleBackToUpdateMenu(interaction);
    }
    else if (customId.startsWith('back_to_update_class_')) {
      await handleBackToUpdateClass(interaction);
    }
    else if (customId.startsWith('back_to_update_timezone_region_')) {
      await handleBackToUpdateTimezoneRegion(interaction);
    }
    else if (customId.startsWith('back_to_update_timezone_country_')) {
      await handleBackToUpdateTimezoneCountry(interaction);
    }
    
    // Add alt character
    else if (customId.startsWith('add_alt_')) {
      await handleAddAlt(interaction);
    }
    
    // Add subclass
    else if (customId.startsWith('add_subclass_')) {
      await handleAddSubclass(interaction);
    }
    
    // Delete handlers
    else if (customId.startsWith('delete_main_')) {
      await handleDeleteMain(interaction);
    }
    else if (customId.startsWith('delete_alt_')) {
      await handleDeleteAlt(interaction);
    }
    else if (customId.startsWith('delete_subclass_')) {
      await handleDeleteSubclass(interaction);
    }
    else if (customId.startsWith('confirm_delete_main_')) {
      await handleConfirmDeleteMain(interaction);
    }
    else if (customId.startsWith('confirm_delete_alt_')) {
      await handleConfirmDeleteAlt(interaction);
    }
    else if (customId.startsWith('confirm_delete_subclass_')) {
      await handleConfirmDeleteSubclass(interaction);
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
      await handleViewCharacter(interaction);
    }

  } catch (error) {
    console.error(`❌ Error handling button ${customId}:`, error);
    
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
      console.error('❌ Error sending error message:', followupError);
    }
  }
});

// Handle select menu interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const customId = interaction.customId;

  try {
    // Update option selection
    if (customId.startsWith('update_option_')) {
      await handleUpdateOptionSelection(interaction);
    }
    // Update class selection
    else if (customId.startsWith('update_class_')) {
      await handleUpdateClassSelection(interaction);
    }
    // Update subclass selection
    else if (customId.startsWith('update_subclass_')) {
      await handleUpdateSubclassSelection(interaction);
    }
    // Update ability score selection
    else if (customId.startsWith('update_ability_score_select_')) {
      await handleUpdateAbilityScoreSelection(interaction);
    }
    // Update guild selection
    else if (customId.startsWith('update_guild_')) {
      await handleUpdateGuildSelection(interaction);
    }
    // Update timezone selections
    else if (customId.startsWith('update_timezone_region_')) {
      await handleUpdateTimezoneRegionSelection(interaction);
    }
    else if (customId.startsWith('update_timezone_country_')) {
      await handleUpdateTimezoneCountrySelection(interaction);
    }
    else if (customId.startsWith('update_timezone_final_')) {
      await handleUpdateTimezoneFinalSelection(interaction);
    }
    // Select alt to update
    else if (customId.startsWith('select_alt_update_')) {
      await handleAltSelectionForUpdate(interaction);
    }
    // Select subclass to update
    else if (customId.startsWith('select_subclass_update_')) {
      await handleSubclassSelectionForUpdate(interaction);
    }
    // Select main or alt for subclass
    else if (customId.startsWith('select_main_or_alt_')) {
      await handleSelectMainOrAlt(interaction);
    }
    // Select alt for subclass
    else if (customId.startsWith('select_alt_for_subclass_')) {
      await handleSelectAltForSubclass(interaction);
    }
    // Select alt to delete
    else if (customId.startsWith('select_delete_alt_')) {
      await handleSelectDeleteAlt(interaction);
    }
    // Select subclass to delete
    else if (customId.startsWith('select_delete_subclass_')) {
      await handleSelectDeleteSubclass(interaction);
    }

  } catch (error) {
    console.error(`❌ Error handling select menu ${customId}:`, error);
    
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
      console.error('❌ Error sending error message:', followupError);
    }
  }
});

// Handle modal submissions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const customId = interaction.customId;

  try {
    // Main character modal
    if (customId.startsWith('main_character_modal')) {
      await handleMainCharacterModal(interaction);
    }
    // Main subclass modal
    else if (customId.startsWith('main_subclass_modal_')) {
      await handleMainSubclassModal(interaction);
    }
    // Alt character modal
    else if (customId.startsWith('alt_character_modal_')) {
      await handleAddAltModal(interaction);
    }
    // Alt subclass modal
    else if (customId.startsWith('alt_subclass_modal_')) {
      await handleAddAltSubclassModal(interaction);
    }
    // Add subclass modal
    else if (customId.startsWith('add_subclass_modal_')) {
      await handleAddSubclassModal(interaction);
    }
    // Update IGN modal
    else if (customId.startsWith('update_ign_modal_')) {
      await handleUpdateModal(interaction, 'ign');
    }

  } catch (error) {
    console.error(`❌ Error handling modal ${customId}:`, error);
    
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
      console.error('❌ Error sending error message:', followupError);
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Express server closed');
    client.destroy();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Express server closed');
    client.destroy();
    process.exit(0);
  });
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
