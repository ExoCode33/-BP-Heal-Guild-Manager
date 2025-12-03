import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { queries } from './database/queries.js';
import googleSheets from './services/googleSheets.js';

// Commands
import register from './commands/register.js';
import addalt from './commands/addalt.js';
import viewchar from './commands/viewchar.js';
import update from './commands/update.js';
import sync from './commands/sync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commands = [register, addalt, viewchar, update, sync];
commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Ready event
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  
  // Initialize database
  try {
    await queries.initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  // Initialize Google Sheets
  try {
    await googleSheets.initialize();
  } catch (error) {
    console.error('Failed to initialize Google Sheets:', error);
  }
});

// Command interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      
      const errorMessage = { 
        content: '❌ There was an error executing this command!', 
        ephemeral: true 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    try {
      // Register command select menus
      if (interaction.customId === 'class_select') {
        await register.handleClassSelect(interaction);
      } else if (interaction.customId === 'subclass_select') {
        await register.handleSubclassSelect(interaction);
      } else if (interaction.customId === 'guild_select') {
        await register.handleGuildSelect(interaction);
      } else if (interaction.customId === 'timezone_select') {
        await register.handleTimezoneSelect(interaction);
      }
      
      // Addalt command select menus
      else if (interaction.customId === 'alt_class_select') {
        await addalt.handleAltClassSelect(interaction);
      } else if (interaction.customId === 'alt_subclass_select') {
        await addalt.handleAltSubclassSelect(interaction);
      }
      
      // Update command select menus
      else if (interaction.customId === 'update_class_select') {
        await update.handleUpdateClassSelect(interaction);
      } else if (interaction.customId === 'update_subclass_select') {
        await update.handleUpdateSubclassSelect(interaction);
      } else if (interaction.customId === 'update_guild_select') {
        await update.handleUpdateGuildSelect(interaction);
      } else if (interaction.customId === 'update_timezone_select') {
        await update.handleUpdateTimezoneSelect(interaction);
      }
    } catch (error) {
      console.error('Error handling select menu:', error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        ephemeral: true 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      if (interaction.customId === 'register_modal') {
        await register.handleModalSubmit(interaction);
      } else if (interaction.customId === 'alt_register_modal') {
        await addalt.handleAltModalSubmit(interaction);
      } else if (interaction.customId === 'update_ability_score_modal') {
        await update.handleAbilityScoreModalSubmit(interaction);
      }
    } catch (error) {
      console.error('Error handling modal submission:', error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        ephemeral: true 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login
client.login(process.env.DISCORD_TOKEN);
