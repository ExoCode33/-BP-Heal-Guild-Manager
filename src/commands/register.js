import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

export default {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your main character'),

  async execute(interaction) {
    console.log(`🔍 [REGISTER] Starting execution for user: ${interaction.user.tag}`);
    
    try {
      console.log(`🔍 [REGISTER] Checking for existing character...`);
      // Check if user already has a main character
      const existingChar = await queries.getMainCharacter(interaction.user.id);
      console.log(`🔍 [REGISTER] Existing character check result:`, existingChar ? 'Found' : 'None');
      
      if (existingChar) {
        console.log(`⚠️  [REGISTER] User already has character, sending warning`);
        return interaction.reply({
          content: '⚠️ You already have a main character registered! Use `/update` to modify your character or `/viewchar` to see your current registration.',
          ephemeral: true
        });
      }

      console.log(`🔍 [REGISTER] Building class selection menu...`);
      // Show class selection menu
      const classMenu = new StringSelectMenuBuilder()
        .setCustomId('class_select')
        .setPlaceholder('Select your main class')
        .addOptions(
          Object.keys(GAME_DATA.classes).map(className => ({
            label: className,
            description: `Role: ${GAME_DATA.classes[className].role}`,
            value: className
          }))
        );

      const row = new ActionRowBuilder().addComponents(classMenu);

      console.log(`🔍 [REGISTER] Sending reply with class menu...`);
      await interaction.reply({
        content: '🎮 **Character Registration**\n\nStep 1: Select your main class',
        components: [row],
        ephemeral: true
      });
      console.log(`✅ [REGISTER] Reply sent successfully`);

      console.log(`🔍 [REGISTER] Storing registration state...`);
      // Store registration state
      interaction.client.registrationStates = interaction.client.registrationStates || new Map();
      interaction.client.registrationStates.set(interaction.user.id, {
        step: 'class_selected',
        discordId: interaction.user.id,
        discordName: interaction.user.tag
      });

    } catch (error) {
      console.error('❌ [REGISTER] Error in register command:', error);
      console.error('❌ [REGISTER] Error stack:', error.stack);
      await interaction.reply({
        content: '❌ An error occurred during registration. Please try again.',
        ephemeral: true
      }).catch(err => console.error('❌ [REGISTER] Failed to send error message:', err));
    }
  },

  async handleClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.className = selectedClass;
      state.role = getRoleFromClass(selectedClass);

      // Show subclass selection
      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('subclass_select')
        .setPlaceholder('Select your subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({
        content: `✅ Class: **${selectedClass}** (${state.role})\n\nStep 2: Select your subclass`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling class selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.subclass = selectedSubclass;

      // Show guild selection
      const guildMenu = new StringSelectMenuBuilder()
        .setCustomId('guild_select')
        .setPlaceholder('Select your guild')
        .addOptions(
          GAME_DATA.guilds.map(guild => ({
            label: guild,
            value: guild
          }))
        );

      const row = new ActionRowBuilder().addComponents(guildMenu);

      await interaction.update({
        content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${selectedSubclass}**\n\nStep 3: Select your guild`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling subclass selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleGuildSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.guild = selectedGuild;

      // Show timezone selection
      const timezoneMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_select')
        .setPlaceholder('Select your timezone')
        .addOptions(
          GAME_DATA.timezones.map(tz => ({
            label: tz,
            value: tz
          }))
        );

      const row = new ActionRowBuilder().addComponents(timezoneMenu);

      await interaction.update({
        content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${state.subclass}**\n✅ Guild: **${selectedGuild}**\n\nStep 4: Select your timezone`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling guild selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezone = selectedTimezone;

      // Show modal for IGN and Ability Score
      const modal = new ModalBuilder()
        .setCustomId('register_modal')
        .setTitle('Final Registration Details');

      const ignInput = new TextInputBuilder()
        .setCustomId('ign_input')
        .setLabel('In-Game Name (IGN)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      const abilityScoreInput = new TextInputBuilder()
        .setCustomId('ability_score_input')
        .setLabel('Ability Score (Total CP/GS)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('e.g., 5000');

      const ignRow = new ActionRowBuilder().addComponents(ignInput);
      const abilityRow = new ActionRowBuilder().addComponents(abilityScoreInput);

      modal.addComponents(ignRow, abilityRow);

      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error handling timezone selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleModalSubmit(interaction) {
    console.log(`🔍 [REGISTER-MODAL] Starting modal submission for user: ${interaction.user.tag}`);
    
    // Defer reply immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });
    console.log(`🔍 [REGISTER-MODAL] Reply deferred`);
    
    try {
      const state = interaction.client.registrationStates.get(interaction.user.id);
      console.log(`🔍 [REGISTER-MODAL] Registration state:`, state ? 'Found' : 'Missing');
      
      if (!state) {
        console.log(`⚠️  [REGISTER-MODAL] State expired`);
        return interaction.editReply({
          content: '❌ Registration session expired. Please use `/register` again.'
        });
      }

      console.log(`🔍 [REGISTER-MODAL] Extracting form data...`);
      const ign = interaction.fields.getTextInputValue('ign_input');
      const abilityScoreStr = interaction.fields.getTextInputValue('ability_score_input');
      const abilityScore = abilityScoreStr ? parseInt(abilityScoreStr) : null;
      console.log(`🔍 [REGISTER-MODAL] IGN: ${ign}, Ability Score: ${abilityScore}`);

      console.log(`🔍 [REGISTER-MODAL] Saving to database...`);
      // Save to database
      const character = await queries.createCharacter({
        discordId: state.discordId,
        discordName: state.discordName,
        ign,
        role: state.role,
        className: state.className,
        subclass: state.subclass,
        abilityScore,
        timezone: state.timezone,
        guild: state.guild
      });
      console.log(`✅ [REGISTER-MODAL] Character saved to database`);

      console.log(`🔍 [REGISTER-MODAL] Attempting to update nickname...`);
      // Update nickname
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.setNickname(ign);
        console.log(`✅ [REGISTER-MODAL] Nickname updated successfully`);
      } catch (nickError) {
        console.error('⚠️  [REGISTER-MODAL] Could not update nickname:', nickError.message);
      }

      console.log(`🔍 [REGISTER-MODAL] Triggering background sync...`);
      // Sync to Google Sheets (background task - don't wait)
      queries.getAllCharacters()
        .then(chars => {
          console.log(`🔍 [SYNC] Got ${chars.length} characters for sync`);
          return queries.getAllAlts().then(alts => {
            console.log(`🔍 [SYNC] Got ${alts.length} alts for sync`);
            return googleSheets.fullSync(chars, alts);
          });
        })
        .then(() => console.log(`✅ [SYNC] Background sync completed`))
        .catch(err => console.error('⚠️  [SYNC] Background sync failed:', err.message));

      console.log(`🔍 [REGISTER-MODAL] Cleaning up state...`);
      // Clean up registration state
      interaction.client.registrationStates.delete(interaction.user.id);

      console.log(`🔍 [REGISTER-MODAL] Sending success reply...`);
      await interaction.editReply({
        content: `✅ **Registration Complete!**\n\n` +
          `👤 **Discord:** ${state.discordName}\n` +
          `🎮 **IGN:** ${ign}\n` +
          `⚔️ **Class:** ${state.className} (${state.subclass})\n` +
          `🛡️ **Role:** ${state.role}\n` +
          `💪 **Ability Score:** ${abilityScore || 'Not provided'}\n` +
          `🌍 **Timezone:** ${state.timezone}\n` +
          `🏰 **Guild:** ${state.guild}\n\n` +
          `Your nickname has been updated to your IGN!\n` +
          `Use \`/addalt\` to register alt characters.`
      });
      console.log(`✅ [REGISTER-MODAL] Success reply sent!`);

    } catch (error) {
      console.error('❌ [REGISTER-MODAL] Error handling modal submission:', error);
      console.error('❌ [REGISTER-MODAL] Error stack:', error.stack);
      
      try {
        await interaction.editReply({
          content: '❌ An error occurred while saving your character. Please try again.'
        });
      } catch (replyError) {
        console.error('❌ [REGISTER-MODAL] Failed to send error reply:', replyError);
      }
    }
  }
};
