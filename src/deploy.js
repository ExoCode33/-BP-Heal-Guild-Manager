import { REST, Routes } from 'discord.js';
import config from './config/index.js';
import { getCommandData } from './commands/index.js';

const rest = new REST().setToken(config.discord.token);

async function deploy() {
  try {
    console.log('Clearing old commands...');
    
    // Clear global commands
    await rest.put(Routes.applicationCommands(config.discord.clientId), { body: [] });
    
    // Clear and deploy guild commands
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: [] }
      );
      
      const commands = getCommandData();
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands to guild`);
    } else {
      const commands = getCommandData();
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands globally`);
    }
  } catch (e) {
    console.error('Deploy failed:', e);
    process.exit(1);
  }
}

deploy();
