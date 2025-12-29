import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/index.js';

export class VerificationSystem {
  
  // OPTION 1: Glamorous Sparkle Theme
  static createVerificationEmbedGlamorous() {
    const embed = new EmbedBuilder()
      .setColor('#FF1493') // Deep pink
      .setTitle('✨ 𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨 𝐢𝐃𝐨𝐥𝐥𝐬 ✨')
      .setDescription(
        '╔═══════════════════════════════════╗\n' +
        '**✦ Step into the spotlight and shine with us! ✦**\n' +
        '╚═══════════════════════════════════╝\n\n' +
        
        '**💎 Registration Requirements:**\n' +
        '```fix\n' +
        '🌟 In-Game Name (IGN)\n' +
        '🎯 User ID (UID)\n' +
        '⚔️  Main Class\n' +
        '🏰 Guild Affiliation\n' +
        '```\n\n' +
        
        '**✨ Your VIP Benefits:**\n' +
        '> 👑 **Verified iDoll Status**\n' +
        '> 💫 **Exclusive Guild Access**\n' +
        '> 🌸 **Class Role & Perks**\n' +
        '> 🎭 **Premium Features**\n' +
        '> 💖 **Elite Community**\n\n' +
        
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '*Ready to become a legend? Click below!* 💫\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .setFooter({ 
        text: '✨ iDolls • Where Stars Are Born • Est. 2024 ✨'
      })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('✨ Become an iDoll ✨')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👑')
      );

    return { embeds: [embed], components: [row] };
  }

  // OPTION 2: Elegant Luxury Theme
  static createVerificationEmbedLuxury() {
    const embed = new EmbedBuilder()
      .setColor('#FFD700') // Gold
      .setTitle('👑 𝐢𝐃𝐨𝐥𝐥𝐬 • 𝐄𝐥𝐢𝐭𝐞 𝐑𝐞𝐠𝐢𝐬𝐭𝐫𝐚𝐭𝐢𝐨𝐧 👑')
      .setDescription(
        '```ansi\n' +
        '\x1b[1;35m╔═══════════════════════════════════════╗\n' +
        '   Welcome to the Most Prestigious Guild\n' +
        '╚═══════════════════════════════════════╝\x1b[0m\n' +
        '```\n' +
        
        '**🌟 What We Need:**\n' +
        '```yaml\n' +
        'IGN: Your In-Game Identity\n' +
        'UID: Your Unique Player ID\n' +
        'Class: Your Combat Specialty\n' +
        'Guild: Your Chosen Family\n' +
        '```\n\n' +
        
        '**💎 Exclusive Member Benefits:**\n' +
        '```diff\n' +
        '+ Verified iDoll Badge\n' +
        '+ Guild Elite Access\n' +
        '+ Premium Class Perks\n' +
        '+ VIP Server Features\n' +
        '+ Legendary Community\n' +
        '```\n\n' +
        
        '> *"Join the guild where legends are forged"*\n' +
        '> **- iDolls Legacy**'
      )
      .setFooter({ 
        text: '👑 iDolls • Excellence is Our Standard 👑'
      })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('🌟 Join The Elite 🌟')
          .setStyle(ButtonStyle.Success)
          .setEmoji('💎')
      );

    return { embeds: [embed], components: [row] };
  }

  // OPTION 3: Kawaii Cute Theme
  static createVerificationEmbedCute() {
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1') // Light pink
      .setTitle('💖 ･ﾟ✧ 𝒲𝑒𝓁𝒸𝑜𝓂𝑒 𝓉𝑜 𝒾𝒟𝑜𝓁𝓁𝓈 ✧･ﾟ💖')
      .setDescription(
        '```\n' +
        '    ╱|、\n' +
        '  (˚ˎ 。7  \n' +
        '   |、˜〵   Welcome home, cutie!\n' +
        '   じしˍ,)ノ\n' +
        '```\n\n' +
        
        '**🎀 What You Need to Bring:**\n' +
        '```ini\n' +
        '[IGN] = Your adorable game name ♡\n' +
        '[UID] = Your special number (´｡• ᵕ •｡`)\n' +
        '[Class] = Your fighting style! ⚔️\n' +
        '[Guild] = Your new family~ 🏰\n' +
        '```\n\n' +
        
        '**✨ Magical Rewards:**\n' +
        '> 🌸 **Verified Cutie Badge**\n' +
        '> 🎀 **Super Cute Guild Role**\n' +
        '> 💫 **Special Class Powers**\n' +
        '> 🦄 **Full Server Magic**\n' +
        '> 💕 **Amazing Friends!!**\n\n' +
        
        '( ˶ˆᗜˆ˵ ) *Ready to join our adventure?* ( ˶ˆᗜˆ˵ )\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '✿ *Click the sparkly button below!* ✿'
      )
      .setFooter({ 
        text: '💕 iDolls • Cutest Guild in the Game! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧'
      })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('🌸 Join Us! 🌸')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✨')
      );

    return { embeds: [embed], components: [row] };
  }

  // OPTION 4: Cyber Glam Theme
  static createVerificationEmbedCyber() {
    const embed = new EmbedBuilder()
      .setColor('#FF00FF') // Magenta/Cyber pink
      .setTitle('⚡ ｉＤｏｌｌｓ • ＮＥＸＴ ＧＥＮ ⚡')
      .setDescription(
        '```ansi\n' +
        '\x1b[1;35m╔════════════════════════════════╗\n' +
        '  INITIALIZING REGISTRATION...\n' +
        '  STATUS: READY FOR INPUT\n' +
        '╚════════════════════════════════╝\x1b[0m\n' +
        '```\n\n' +
        
        '**⚡ REQUIRED DATA:**\n' +
        '```css\n' +
        '┌─ [ INPUT_IGN ] ──────────────┐\n' +
        '│  Your In-Game Handle         │\n' +
        '├─ [ INPUT_UID ] ──────────────┤\n' +
        '│  Your Unique Identifier      │\n' +
        '├─ [ SELECT_CLASS ] ───────────┤\n' +
        '│  Combat Specialization       │\n' +
        '├─ [ SELECT_GUILD ] ───────────┤\n' +
        '│  Guild Registration          │\n' +
        '└───────────────────────────────┘\n' +
        '```\n\n' +
        
        '**💫 ACCESS GRANTED:**\n' +
        '```diff\n' +
        '+ ✓ VERIFIED_STATUS\n' +
        '+ ✓ GUILD_ACCESS\n' +
        '+ ✓ CLASS_PERKS\n' +
        '+ ✓ SERVER_FEATURES\n' +
        '+ ✓ COMMUNITY_HUB\n' +
        '```\n\n' +
        
        '> **WARNING:** Joining iDolls may cause excessive coolness 😎\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .setFooter({ 
        text: '⚡ iDolls • Next Level Gaming ⚡'
      })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('⚡ INITIALIZE ⚡')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔥')
      );

    return { embeds: [embed], components: [row] };
  }

  // Main method - change this to switch themes
  static createVerificationEmbed() {
    // CHOOSE YOUR THEME HERE:
    // return this.createVerificationEmbedGlamorous();  // Sparkly & glamorous
    // return this.createVerificationEmbedLuxury();     // Gold & elegant
    return this.createVerificationEmbedCute();       // Kawaii & adorable ⭐ DEFAULT
    // return this.createVerificationEmbedCyber();      // Futuristic & edgy
  }

  static async sendOrUpdateVerificationMessage(channel) {
    try {
      console.log('[VERIFICATION] Fetching messages from channel:', channel.name);
      const messages = await channel.messages.fetch({ limit: 10 });
      console.log('[VERIFICATION] Fetched', messages.size, 'messages');
      
      const botMessages = messages.filter(m => 
        m.author.id === channel.client.user.id && 
        m.embeds.length > 0 && 
        (m.embeds[0].title?.includes('iDolls') || m.embeds[0].title?.includes('iＤｏｌｌｓ'))
      );

      console.log('[VERIFICATION] Found', botMessages.size, 'existing verification messages');

      const content = this.createVerificationEmbed();

      if (botMessages.size > 0) {
        const existingMessage = botMessages.first();
        console.log('[VERIFICATION] Updating existing message:', existingMessage.id);
        await existingMessage.edit(content);
        console.log('[VERIFICATION] ✅ Message updated successfully');
        return existingMessage;
      } else {
        console.log('[VERIFICATION] Sending new verification message...');
        const message = await channel.send(content);
        console.log('[VERIFICATION] ✅ Message sent successfully, ID:', message.id);
        return message;
      }
    } catch (error) {
      console.error('[VERIFICATION] ❌ Error sending/updating message:', error.message);
      throw error;
    }
  }

  static async getVerificationChannelId(guildId) {
    try {
      const result = await db.query(
        'SELECT verification_channel_id FROM guild_settings WHERE guild_id = $1',
        [guildId]
      );
      
      if (result.rows && result.rows.length > 0 && result.rows[0].verification_channel_id) {
        console.log('[VERIFICATION] Found channel ID in database:', result.rows[0].verification_channel_id);
        return result.rows[0].verification_channel_id;
      }
      
      const envChannelId = process.env.VERIFICATION_CHANNEL_ID;
      if (envChannelId) {
        console.log('[VERIFICATION] Using channel ID from environment:', envChannelId);
        return envChannelId;
      }
      
      return null;
    } catch (error) {
      console.error('[VERIFICATION] Error reading from database:', error.message);
      return process.env.VERIFICATION_CHANNEL_ID || null;
    }
  }

  static async setVerificationChannelId(guildId, channelId) {
    try {
      await db.query(
        `INSERT INTO guild_settings (guild_id, verification_channel_id, updated_at) 
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id) 
         DO UPDATE SET verification_channel_id = $2, updated_at = NOW()`,
        [guildId, channelId]
      );
      console.log('[VERIFICATION] Saved channel ID to database:', channelId);
      return true;
    } catch (error) {
      console.error('[VERIFICATION] Error saving to database:', error.message);
      return false;
    }
  }

  static async setupVerificationChannel(client, guildId) {
    console.log('[VERIFICATION] ════════════════════════════════');
    console.log('[VERIFICATION] Starting verification setup...');
    
    const channelId = await this.getVerificationChannelId(guildId);
    
    console.log('[VERIFICATION] Config check:', {
      guildId: guildId,
      channelId: channelId || 'NOT SET',
      source: channelId ? 'database or env' : 'not configured'
    });

    if (!channelId) {
      console.log('[VERIFICATION] ⚠️ No verification channel configured');
      console.log('[VERIFICATION] Use /admin settings → Verification to set channel');
      console.log('[VERIFICATION] ════════════════════════════════');
      return;
    }

    try {
      console.log('[VERIFICATION] Attempting to fetch channel:', channelId);
      const channel = await client.channels.fetch(channelId);
      
      if (!channel) {
        console.error('[VERIFICATION] ❌ Channel not found with ID:', channelId);
        console.log('[VERIFICATION] ════════════════════════════════');
        return;
      }

      console.log('[VERIFICATION] ✅ Channel found:', {
        name: channel.name,
        id: channel.id,
        type: channel.type,
        guild: channel.guild?.name
      });

      const permissions = channel.permissionsFor(client.user);
      const hasPermissions = permissions?.has('SendMessages') && permissions?.has('EmbedLinks');
      
      console.log('[VERIFICATION] Bot permissions:', {
        sendMessages: permissions?.has('SendMessages') || false,
        embedLinks: permissions?.has('EmbedLinks') || false,
        readMessageHistory: permissions?.has('ReadMessageHistory') || false
      });

      if (!hasPermissions) {
        console.error('[VERIFICATION] ❌ Bot lacks required permissions');
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
      console.error('[VERIFICATION] ❌ Setup failed:', error.message);
      console.error('[VERIFICATION] ════════════════════════════════');
    }
  }
}
