import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

export async function handleUpdateMain(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Get current main character
    const mainChar = await queries.getMainCharacter(userId);
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('You don\'t have a main character to update!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show update options menu
    await showUpdateOptionsMenu(interaction, userId, mainChar);
    
  } catch (error) {
    console.error('Error in handleUpdateMain:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showUpdateOptionsMenu(interaction, userId, mainChar) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_option_${userId}`)
    .setPlaceholder('✏️ What would you like to update?')
    .addOptions([
      {
        label: 'Change Class/Subclass',
        value: 'class',
        description: 'Update your class and subclass',
        emoji: '🎭'
      },
      {
        label: 'Change IGN',
        value: 'ign',
        description: 'Update your in-game name',
        emoji: '🎮'
      },
      {
        label: 'Update Ability Score',
        value: 'ability_score',
        description: 'Update your ability score',
        emoji: '💪'
      },
      {
        label: 'Change Timezone',
        value: 'timezone',
        description: 'Update your timezone',
        emoji: '🌍'
      },
      {
        label: 'Change Guild',
        value: 'guild',
        description: 'Update your guild affiliation',
        emoji: '🏰'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Main Character')
    .setDescription('Select what you\'d like to update')
    .addFields(
      { name: '🎮 Current IGN', value: mainChar.ign, inline: true },
      { name: '🎭 Current Class', value: `${mainChar.class} (${mainChar.subclass})`, inline: true },
      { name: '⚔️ Role', value: mainChar.role, inline: true }
    )
    .setFooter({ text: '💡 Choose an option to update' })
    .setTimestamp();

  if (mainChar.ability_score) {
    embed.addFields({ name: '💪 Ability Score', value: mainChar.ability_score.toString(), inline: true });
  }
  if (mainChar.timezone) {
    embed.addFields({ name: '🌍 Timezone', value: mainChar.timezone, inline: true });
  }
  if (mainChar.guild) {
    embed.addFields({ name: '🏰 Guild', value: mainChar.guild, inline: true });
  }

  await interaction.update({ embeds: [embed], components: [row] });
  
  // Store state
  stateManager.setUpdateState(userId, { mainChar });
}

export async function handleUpdateOptionSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const option = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state || !state.mainChar) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    switch (option) {
      case 'class':
        await showClassSelectionForUpdate(interaction, userId, state.mainChar);
        break;
      case 'ign':
        await showIGNModal(interaction, userId, state.mainChar);
        break;
      case 'ability_score':
        await showAbilityScoreModal(interaction, userId, state.mainChar);
        break;
      case 'timezone':
        await showTimezoneModal(interaction, userId, state.mainChar);
        break;
      case 'guild':
        await showGuildSelectionForUpdate(interaction, userId, state.mainChar);
        break;
    }
    
  } catch (error) {
    console.error('Error in handleUpdateOptionSelection:', error);
    stateManager.clearUpdateState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showClassSelectionForUpdate(interaction, userId, mainChar) {
  const classes = Object.keys(GAME_DATA.classes);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_class_${userId}`)
    .setPlaceholder('🎭 Choose your new class')
    .addOptions(
      classes.map(className => ({
        label: className,
        value: className,
        emoji: getClassEmoji(className),
        default: className === mainChar.class
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Class')
    .setDescription('Select your new class')
    .addFields({
      name: '🎭 Current Class',
      value: `${mainChar.class} (${mainChar.subclass})`,
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'class' });
}

export async function handleUpdateClassSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedClass = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const subclasses = getSubclassesForClass(selectedClass);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`update_subclass_${userId}`)
      .setPlaceholder('🎯 Choose your new subclass')
      .addOptions(
        subclasses.map(subclass => ({
          label: subclass,
          value: subclass
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Update Subclass')
      .setDescription(`Select your ${selectedClass} subclass`)
      .addFields({
        name: '🎭 New Class',
        value: selectedClass,
        inline: true
      })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row] });
    
    stateManager.setUpdateState(userId, {
      ...state,
      newClass: selectedClass
    });
    
  } catch (error) {
    console.error('Error in handleUpdateClassSelection:', error);
    stateManager.clearUpdateState(interaction.user.id);
  }
}

export async function handleUpdateSubclassSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedSubclass = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state || !state.newClass) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    const newRole = getRoleFromClass(state.newClass);
    
    await queries.updateCharacter(userId, state.mainChar.ign, {
      class: state.newClass,
      subclass: selectedSubclass,
      role: newRole
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Class Updated!')
      .setDescription('Your main character\'s class has been updated.')
      .addFields(
        { name: '🎭 New Class', value: `${state.newClass} (${selectedSubclass})`, inline: true },
        { name: '⚔️ New Role', value: newRole, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearUpdateState(userId);
    
    // Return to main menu
    const editMemberDetails = await import('../commands/edit-member-details.js');
    setTimeout(async () => {
      await editMemberDetails.default.showMainMenu(interaction, true);
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleUpdateSubclassSelection:', error);
    stateManager.clearUpdateState(interaction.user.id);
  }
}

async function showIGNModal(interaction, userId, mainChar) {
  const modal = new ModalBuilder()
    .setCustomId(`update_ign_modal_${userId}`)
    .setTitle('Update IGN');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('New In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your new character name')
    .setValue(mainChar.ign)
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'ign' });
}

async function showAbilityScoreModal(interaction, userId, mainChar) {
  const modal = new ModalBuilder()
    .setCustomId(`update_ability_modal_${userId}`)
    .setTitle('Update Ability Score');

  const abilityInput = new TextInputBuilder()
    .setCustomId('ability_score')
    .setLabel('Ability Score')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 25000')
    .setValue(mainChar.ability_score ? mainChar.ability_score.toString() : '')
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(abilityInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'ability_score' });
}

async function showTimezoneModal(interaction, userId, mainChar) {
  const modal = new ModalBuilder()
    .setCustomId(`update_timezone_modal_${userId}`)
    .setTitle('Update Timezone');

  const timezoneInput = new TextInputBuilder()
    .setCustomId('timezone')
    .setLabel('Timezone')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., America/New_York or EST')
    .setValue(mainChar.timezone || '')
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(timezoneInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'timezone' });
}

async function showGuildSelectionForUpdate(interaction, userId, mainChar) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ No Guilds Configured')
      .setDescription('There are no guilds configured in the system.')
      .setTimestamp();
    
    return interaction.update({ embeds: [embed], components: [] });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_guild_${userId}`)
    .setPlaceholder('🏰 Choose your new guild')
    .addOptions(
      guilds.map(guild => ({
        label: guild.name,
        value: guild.name,
        emoji: guild.isVisitor ? '👋' : '🏰',
        default: guild.name === mainChar.guild
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Guild')
    .setDescription('Select your new guild')
    .addFields({
      name: '🏰 Current Guild',
      value: mainChar.guild || 'None',
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'guild' });
}

export async function handleUpdateGuildSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedGuild = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    await queries.updateCharacter(userId, state.mainChar.ign, {
      guild: selectedGuild
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Guild Updated!')
      .setDescription('Your guild affiliation has been updated.')
      .addFields({
        name: '🏰 New Guild',
        value: selectedGuild,
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearUpdateState(userId);
    
    // Return to main menu
    const editMemberDetails = await import('../commands/edit-member-details.js');
    setTimeout(async () => {
      await editMemberDetails.default.showMainMenu(interaction, true);
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleUpdateGuildSelection:', error);
    stateManager.clearUpdateState(interaction.user.id);
  }
}

export async function handleUpdateModal(interaction, updateType) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let updates = {};
    let fieldName = '';
    let newValue = '';

    if (updateType === 'ign') {
      const newIGN = interaction.fields.getTextInputValue('ign');
      updates = { ign: newIGN };
      fieldName = '🎮 New IGN';
      newValue = newIGN;
    } else if (updateType === 'ability_score') {
      const abilityScore = interaction.fields.getTextInputValue('ability_score');
      updates = { ability_score: abilityScore ? parseInt(abilityScore) : null };
      fieldName = '💪 New Ability Score';
      newValue = abilityScore || 'Not set';
    } else if (updateType === 'timezone') {
      const timezone = interaction.fields.getTextInputValue('timezone');
      updates = { timezone: timezone || null };
      fieldName = '🌍 New Timezone';
      newValue = timezone || 'Not set';
    }

    await queries.updateCharacter(userId, state.mainChar.ign, updates);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Character Updated!')
      .setDescription('Your main character has been updated.')
      .addFields({
        name: fieldName,
        value: newValue,
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    stateManager.clearUpdateState(userId);
    
    // Return to main menu
    const editMemberDetails = await import('../commands/edit-member-details.js');
    setTimeout(async () => {
      await editMemberDetails.default.showMainMenu(interaction, true);
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleUpdateModal:', error);
    stateManager.clearUpdateState(interaction.user.id);
  }
}

function getClassEmoji(className) {
  const emojis = {
    'Beat Performer': '🎵',
    'Frost Mage': '❄️',
    'Heavy Guardian': '🛡️',
    'Marksman': '🏹',
    'Shield Knight': '⚔️',
    'Stormblade': '⚡',
    'Verdant Oracle': '🌿',
    'Wind Knight': '💨'
  };
  return emojis[className] || '⭐';
}
