import { Client, GatewayIntentBits, Events, REST, Routes } from 'discord.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// EXPRESS SERVER FOR STATIC FILE HOSTING
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    classIconsAvailable: true
  });
});

// Log available class icons
app.get('/class-icons', (req, res) => {
  const icons = [
    'BeatPerformer.png',
    'FrostMage.png',
    'HeavyGuardian.png',
    'Marksman.png',
    'ShieldKnight.png',
    'StormBlade.png',
    'VerdantOracle.png',
    'WindKnight.png'
  ];
  
  const baseUrl = process.env.RAILWAY_PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : `http://localhost:${PORT}`;
  
  res.json({
    message: 'Available class icons',
    baseUrl: baseUrl,
    icons: icons.map(icon => `${baseUrl}/class-icons/${icon}`)
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✅ Static file server running on port ${PORT}`);
  const displayUrl = process.env.RAILWAY_PUBLIC_URL || 
                     (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`);
  console.log(`📸 Class icons available at: ${displayUrl}/class-icons/`);
  console.log(`🏥 Health check: ${displayUrl}/health`);
});

// ============================================
// DISCORD BOT
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Discord bot logged in as ${readyClient.user.tag}`);
  
  // Initialize services
  const { initializeServices } = await import('./src/services/index.js');
  await initializeServices();
  
  // Register commands
  try {
    console.log('🔄 Refreshing application (/) commands...');
    
    const { commands } = await import('./src/commands/index.js');
    const commandData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());
    
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    const data = await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commandData },
    );
    
    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Error refreshing commands:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commands } = await import('./src/commands/index.js');
  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    
    const errorMessage = { 
      content: 'There was an error while executing this command!', 
      ephemeral: true 
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});
