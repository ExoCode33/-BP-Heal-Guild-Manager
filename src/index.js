import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from './utils/config.js';
import logger from './utils/logger.js';
import db from './services/database.js';
import sheetsService from './services/sheets.js';
import * as interactionHandlers from './handlers/interactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

async function loadCommands() {
  const commandFolders = ['user', 'admin'];
  for (const folder of commandFolders) {
    const commandsPath = join(__dirname, 'commands', folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      if (command.default && 'data' in command.default && 'execute' in command.default) {
        client.commands.set(command.default.data.name, command.default);
      }
    }
  }
}

client.once(Events.ClientReady, async () => {
  // Initialize logger with Discord client
  if (config.channels.log && config.logging.toChannel) {
    logger.setClient(client, config.channels.log);
  }
  
  // Bot startup logging
  console.log('\x1b[33m[BOT STARTED]\x1b[0m ' + new Date().toLocaleTimeString());
  console.log('\x1b[33m[BOT STARTED]\x1b[0m Logged in as: \x1b[36m' + client.user.tag + '\x1b[0m');
  console.log('\x1b[33m[BOT STARTED]\x1b[0m Server: \x1b[36mport ' + (process.env.PORT || 3000) + '\x1b[0m');
  console.log('\x1b[33m[BOT STARTED]\x1b[0m Commands: \x1b[36m' + client.commands.size + ' commands\x1b[0m');
  console.log('\x1b[33m[BOT STARTED]\x1b[0m Activated Handlers: \x1b[36mcharacter, registration, update, subclass, remove\x1b[0m');
  
  try {
    await db.initializeDatabase();
    logger.success('Database ready');
  } catch (error) {
    logger.error(`Database init failed: ${error.message}`);
  }
  
  setInterval(async () => {
    try {
      const allChars = await db.getAllCharacters();
      await sheetsService.syncAllCharacters(allChars);
      logger.log('Auto-sync done');
    } catch (error) {
      logger.error(`Auto-sync failed: ${error.message}`);
    }
  }, config.sync.autoSyncInterval);
  logger.log('Auto-sync scheduled');
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        logger.error(`Command not found: ${interaction.commandName}`);
        return;
      }
      
      // Log command usage
      console.log('\x1b[35m[COMMAND]\x1b[0m ' + new Date().toLocaleTimeString() + ' - /' + interaction.commandName + ' by \x1b[36m' + interaction.user.tag + '\x1b[0m');
      
      await command.execute(interaction);
    }
    else if (interaction.isButton()) await interactionHandlers.handleButtonInteraction(interaction);
    else if (interaction.isStringSelectMenu()) await interactionHandlers.handleSelectMenuInteraction(interaction);
    else if (interaction.isModalSubmit()) await interactionHandlers.handleModalSubmit(interaction);
  } catch (error) {
    logger.error(`Interaction error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/health', (req, res) => { res.status(200).json({ status: 'ok', uptime: process.uptime() }); });
app.listen(PORT, () => { logger.log(`Health server on port ${PORT}`); });

async function start() {
  try {
    await loadCommands();
    await client.login(config.discord.token);
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', async () => { logger.log('Shutting down...'); await client.destroy(); process.exit(0); });
process.on('SIGTERM', async () => { logger.log('Shutting down...'); await client.destroy(); process.exit(0); });

start();
