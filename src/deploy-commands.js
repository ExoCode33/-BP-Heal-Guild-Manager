import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Import commands
import register from './commands/register.js';
import addalt from './commands/addalt.js';
import viewchar from './commands/viewchar.js';
import update from './commands/update.js';
import sync from './commands/sync.js';

dotenv.config();

const commands = [
  register.data.toJSON(),
  addalt.data.toJSON(),
  viewchar.data.toJSON(),
  update.data.toJSON(),
  sync.data.toJSON(),
];

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // For guild-based commands (faster during development)
    if (process.env.GUILD_ID) {
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} guild (/) commands.`);
    } 
    // For global commands (takes up to 1 hour to propagate)
    else {
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
    }
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
