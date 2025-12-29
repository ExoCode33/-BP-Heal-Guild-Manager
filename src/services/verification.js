import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config/index.js';

export class VerificationSystem {
  static createVerificationEmbed() {
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('🎮 Character Registration')
      .setDescription(
        '**Welcome to the server!**\n\n' +
        'Click the button below to register your character and gain access to the server.\n\n' +
        '**What you\'ll need:**\n' +
        '• Your in-game name (IGN)\n' +
        '• Your User ID (UID)\n' +
        '• Your character class\n' +
        '• Your guild affiliation\n\n' +
        '**After registration:**\n' +
        '✅ Verified role\n' +
        '✅ Guild role\n' +
        '✅ Class role\n' +
        '✅ Full server access'
      )
      .setFooter({ text: 'Click the button below to get started!' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('📝 Register Character')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎮')
      );

    return { embeds: [embed], components: [row] };
  }

  static async sendOrUpdateVerificationMessage(channel) {
    try {
      console.log('[VERIFICATION] Fetching messages from channel:', channel.name);
      const messages = await channel.messages.fetch({ limit: 10 });
      console.log('[VERIFICATION] Fetched', messages.size, 'messages');
      
      const botMessages = messages.filter(m => 
        m.author.id === channel.client.user.id && 
        m.embeds.length > 0 && 
        m.embeds[0].title === '🎮 Character Registration'
      );

      console.log('[VERIFICATION] Found', botMessages.size, 'existing verification messages');

      const content = this.createVerificationEmbed();

      if (botMessages.size > 0) {
        // Update existing message
        const existingMessage = botMessages.first();
        console.log('[VERIFICATION] Updating existing message:', existingMessage.id);
        await existingMessage.edit(content);
        console.log('[VERIFICATION] ✅ Message updated successfully');
        return existingMessage;
      } else {
        // Send new message
        console.log('[VERIFICATION] Sending new verification message...');
        const message = await channel.send(content);
        console.log('[VERIFICATION] ✅ Message sent successfully, ID:', message.id);
        return message;
      }
    } catch (error) {
      console.error('[VERIFICATION] ❌ Error sending/updating message:', error);
      console.error('[VERIFICATION] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      throw error;
    }
  }

  static async setupVerificationChannel(client) {
    const channelId = config.channels.verification;
    
    console.log('[VERIFICATION] ════════════════════════════════');
    console.log('[VERIFICATION] Starting verification setup...');
    console.log('[VERIFICATION] Config check:', {
      channelId: channelId || 'NOT SET',
      hasConfig: !!config.channels,
      hasVerification: !!config.channels?.verification
    });

    if (!channelId) {
      console.log('[VERIFICATION] ⚠️ No verification channel configured in .env');
      console.log('[VERIFICATION] Add VERIFICATION_CHANNEL_ID to your .env file');
      console.log('[VERIFICATION] ════════════════════════════════');
      return;
    }

    try {
      console.log('[VERIFICATION] Attempting to fetch channel:', channelId);
      const channel = await client.channels.fetch(channelId);
      
      if (!channel) {
        console.error('[VERIFICATION] ❌ Channel not found with ID:', channelId);
        console.error('[VERIFICATION] Please verify the channel ID is correct');
        console.log('[VERIFICATION] ════════════════════════════════');
        return;
      }

      console.log('[VERIFICATION] ✅ Channel found:', {
        name: channel.name,
        id: channel.id,
        type: channel.type,
        guild: channel.guild?.name
      });

      // Check permissions
      const permissions = channel.permissionsFor(client.user);
      console.log('[VERIFICATION] Bot permissions:', {
        viewChannel: permissions?.has('ViewChannel') || false,
        sendMessages: permissions?.has('SendMessages') || false,
        embedLinks: permissions?.has('EmbedLinks') || false,
        readMessageHistory: permissions?.has('ReadMessageHistory') || false
      });

      if (!permissions?.has('SendMessages')) {
        console.error('[VERIFICATION] ❌ Bot lacks SendMessages permission');
        console.log('[VERIFICATION] ════════════════════════════════');
        return;
      }

      if (!permissions?.has('EmbedLinks')) {
        console.error('[VERIFICATION] ❌ Bot lacks EmbedLinks permission');
        console.log('[VERIFICATION] ════════════════════════════════');
        return;
      }

      console.log('[VERIFICATION] Sending/updating verification message...');
      await this.sendOrUpdateVerificationMessage(channel);
      
      console.log('[VERIFICATION] ════════════════════════════════');
      console.log('[VERIFICATION] ✅ Verification system ready!');
      console.log('[VERIFICATION] Channel:', channel.name);
      console.log('[VERIFICATION] Users can now click the button to register');
      console.log('[VERIFICATION] ════════════════════════════════');
    } catch (error) {
      console.error('[VERIFICATION] ════════════════════════════════');
      console.error('[VERIFICATION] ❌ Setup failed with error:', error.message);
      console.error('[VERIFICATION] Error type:', error.name);
      if (error.code) {
        console.error('[VERIFICATION] Discord error code:', error.code);
      }
      console.error('[VERIFICATION] ════════════════════════════════');
      throw error;
    }
  }
}
