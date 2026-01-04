import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CharacterRepo, BattleImagineRepo } from '../database/repositories.js';
import { updateNickname } from '../services/nickname.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/profile.js';
import { CLASSES, ABILITY_SCORES, COLORS } from '../utils/constants.js';
import { getClassIconId } from '../utils/classRoleMapping.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import * as classRoleService from '../services/classRole.js';
import * as applicationService from '../services/application.js';

// ═══════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

const editingState = new Map();

const state = {
  set(userId, key, value) {
    const userState = editingState.get(userId) || {};
    userState[key] = value;
    editingState.set(userId, userState);
  },

  get(userId, key) {
    const userState = editingState.get(userId);
    return userState ? userState[key] : null;
  },

  clear(userId) {
    editingState.delete(userId);
  }
};

// ═══════════════════════════════════════════════════════════════════
// EDIT CHARACTER - CHOOSE MAIN OR ALT
// ═══════════════════════════════════════════════════════════════════

export async function showEditCharacterChoice(interaction, userId) {
  console.log('[EDITING] Showing edit character choice for user:', userId);

  const main = await CharacterRepo.findMain(userId);
  const alts = await CharacterRepo.findAlts(userId);

  if (!main && alts.length === 0) {
    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        '# ❌ **No Characters**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'You don\'t have any characters to edit.'
      )
      .setTimestamp();
    
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }

  // If only main exists
  if (main && alts.length === 0) {
    await showEditOptions(interaction, userId, main.id, 'main');
    return;
  }

  // If alts exist, show choice
  const choiceEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# ✏️ **Edit Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'Choose which character to edit:\n\n' +
      (main ? `**Main:** ${main.ign} (${main.class})\n\n` : '') +
      (alts.length > 0 ? `**Alts:**\n${alts.map((a, i) => `${i + 1}. ${a.ign} (${a.class})`).join('\n')}` : '')
    )
    .setTimestamp();

  const options = [];
  
  if (main) {
    options.push({
      label: `Main: ${main.ign}`,
      value: `main_${main.id}`,
      description: `${main.class} - ${main.subclass}`,
      emoji: '👑'
    });
  }

  alts.forEach(alt => {
    options.push({
      label: `Alt: ${alt.ign}`,
      value: `alt_${alt.id}`,
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎮'
    });
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_character_to_edit_${userId}`)
    .setPlaceholder('Choose a character to edit')
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [choiceEmbed], components: [row1, row2] });
}

export async function handleCharacterToEditSelection(interaction, userId, selection) {
  const [type, characterId] = selection.split('_');
  await showEditOptions(interaction, userId, parseInt(characterId), type);
}

// ═══════════════════════════════════════════════════════════════════
// EDIT OPTIONS MENU
// ═══════════════════════════════════════════════════════════════════

async function showEditOptions(interaction, userId, characterId, characterType) {
  const character = await CharacterRepo.findById(characterId);

  if (!character) {
    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription('❌ Character not found.');
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }

  state.set(userId, 'characterId', characterId);
  state.set(userId, 'characterType', characterType);

  const editEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ✏️ **Edit ${characterType === 'main' ? 'Main' : 'Alt'} Character**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${character.ign}\n` +
      `**Class:** ${character.class} - ${character.subclass}\n` +
      `**Score:** ${character.ability_score}\n` +
      `**Guild:** ${character.guild}\n\n` +
      'Select what to edit:'
    )
    .setTimestamp();

  const editIGNButton = new ButtonBuilder()
    .setCustomId(`edit_ign_${userId}`)
    .setLabel('✏️ Edit IGN')
    .setStyle(ButtonStyle.Primary);

  const editUIDButton = new ButtonBuilder()
    .setCustomId(`edit_uid_${userId}`)
    .setLabel('🆔 Edit UID')
    .setStyle(ButtonStyle.Primary);

  const editClassButton = new ButtonBuilder()
    .setCustomId(`edit_class_${userId}`)
    .setLabel('🎭 Edit Class')
    .setStyle(ButtonStyle.Primary);

  const editScoreButton = new ButtonBuilder()
    .setCustomId(`edit_score_${userId}`)
    .setLabel('💪 Edit Score')
    .setStyle(ButtonStyle.Primary);

  const editBIButton = new ButtonBuilder()
    .setCustomId(`edit_battle_imagines_${userId}`)
    .setLabel('⚔️ Edit Battle Imagines')
    .setStyle(ButtonStyle.Primary);

  const editGuildButton = new ButtonBuilder()
    .setCustomId(`edit_guild_${userId}`)
    .setLabel('🏰 Edit Guild')
    .setStyle(ButtonStyle.Primary);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(editIGNButton, editUIDButton, editClassButton);
  const row2 = new ActionRowBuilder().addComponents(editScoreButton, editBIButton, editGuildButton);
  const row3 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [editEmbed], components: [row1, row2, row3] });
}

// ═══════════════════════════════════════════════════════════════════
// EDIT IGN
// ═══════════════════════════════════════════════════════════════════

export async function showEditIGNModal(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const character = await CharacterRepo.findById(characterId);

  const modal = new ModalBuilder()
    .setCustomId(`edit_ign_modal_${userId}`)
    .setTitle('Edit IGN');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('New In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter new IGN')
    .setValue(character.ign)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleEditIGN(interaction, userId) {
  const newIGN = interaction.fields.getTextInputValue('ign');
  const characterId = state.get(userId, 'characterId');
  const characterType = state.get(userId, 'characterType');

  try {
    await CharacterRepo.update(characterId, { ign: newIGN });
    console.log('[EDITING] Updated IGN:', characterId, newIGN);

    // Only sync nickname for main character
    if (characterType === 'main' && config.sync.nicknameEnabled) {
      try {
        const result = await updateNickname(interaction.client, config.discord.guildId, userId, newIGN);
        if (result.success) {
          console.log(`✅ [EDITING] Nickname synced: ${newIGN}`);
        } else {
          console.error(`❌ [EDITING] Nickname sync failed: ${result.reason}`);
        }
      } catch (e) {
        console.error('[EDITING] Nickname sync error:', e.message);
      }
    }

    logger.register(interaction.user.username, `edited_${characterType}_ign`, newIGN, 'IGN changed');

    state.clear(userId);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[EDITING ERROR]', error);
    logger.error('Editing', `Edit IGN error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EDIT UID
// ═══════════════════════════════════════════════════════════════════

export async function showEditUIDModal(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const character = await CharacterRepo.findById(characterId);

  const modal = new ModalBuilder()
    .setCustomId(`edit_uid_modal_${userId}`)
    .setTitle('Edit UID');

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('New User ID (UID)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter new UID (numbers only)')
    .setValue(character.uid)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(uidInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleEditUID(interaction, userId) {
  const newUID = interaction.fields.getTextInputValue('uid').trim();
  const characterId = state.get(userId, 'characterId');
  const characterType = state.get(userId, 'characterType');

  if (!/^\d+$/.test(newUID)) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription('# ❌ **Invalid UID**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**UID must contain only numbers.**\n\nYou entered: `' + newUID + '`');
    
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }

  try {
    await CharacterRepo.update(characterId, { uid: newUID });
    console.log('[EDITING] Updated UID:', characterId, newUID);

    logger.register(interaction.user.username, `edited_${characterType}_uid`, newUID, 'UID changed');

    state.clear(userId);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[EDITING ERROR]', error);
    logger.error('Editing', `Edit UID error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EDIT CLASS
// ═══════════════════════════════════════════════════════════════════

export async function showEditClass(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const character = await CharacterRepo.findById(characterId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# 🎭 **Edit Class**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${character.class} - ${character.subclass}\n\n` +
      'Select new class:'
    )
    .setTimestamp();

  const classOptions = Object.entries(CLASSES).map(([name, data]) => ({
    label: name,
    value: name,
    description: data.role,
    emoji: data.iconId ? { id: data.iconId } : data.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_class_${userId}`)
    .setPlaceholder('🎭 Pick your class')
    .addOptions(classOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_options_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleEditClassSelection(interaction, userId) {
  const className = interaction.values[0];
  const characterId = state.get(userId, 'characterId');
  
  state.set(userId, 'newClass', className);

  const subclasses = CLASSES[className].subclasses;
  const classRole = CLASSES[className].role;

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# ✨ **Edit Subclass**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**New Class:** ${className}\n\n` +
      'Select new subclass:'
    )
    .setTimestamp();

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    const iconId = getClassIconId(className);
    
    return {
      label: subclassName,
      value: subclassName,
      description: classRole,
      emoji: iconId ? { id: iconId } : roleEmoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_subclass_${userId}`)
    .setPlaceholder('📋 Pick your subclass')
    .addOptions(subclassOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`edit_class_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleEditSubclassSelection(interaction, userId) {
  const subclassName = interaction.values[0];
  const characterId = state.get(userId, 'characterId');
  const newClass = state.get(userId, 'newClass');
  const characterType = state.get(userId, 'characterType');

  try {
    const oldCharacter = await CharacterRepo.findById(characterId);
    const oldClass = oldCharacter.class;

    // Update the character
    await CharacterRepo.update(characterId, { 
      class: newClass, 
      subclass: subclassName 
    });
    console.log('[EDITING] Updated class:', characterId, newClass, subclassName);

    // Update class roles
    await classRoleService.addClassRole(userId, newClass);
    
    // Check if old class is still used by other characters
    const hasOtherWithOldClass = await CharacterRepo.hasAnyCharacterWithClass(userId, oldClass);
    if (!hasOtherWithOldClass) {
      await classRoleService.removeClassRole(userId, oldClass);
    }

    logger.register(interaction.user.username, `edited_${characterType}_class`, `${newClass} - ${subclassName}`, `from ${oldClass}`);

    state.clear(userId);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[EDITING ERROR]', error);
    logger.error('Editing', `Edit class error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EDIT SCORE
// ═══════════════════════════════════════════════════════════════════

export async function showEditScore(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const character = await CharacterRepo.findById(characterId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# 💪 **Edit Ability Score**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${character.ability_score}\n\n` +
      'Select new score:'
    )
    .setTimestamp();

  const scoreOptions = ABILITY_SCORES.map(score => ({
    label: score.label,
    value: score.value,
    description: 'Your ability score range',
    emoji: '💪'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_score_${userId}`)
    .setPlaceholder('💪 Pick your score')
    .addOptions(scoreOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_options_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleEditScoreSelection(interaction, userId) {
  const newScore = interaction.values[0];
  const characterId = state.get(userId, 'characterId');
  const characterType = state.get(userId, 'characterType');

  try {
    await CharacterRepo.update(characterId, { ability_score: newScore });
    console.log('[EDITING] Updated score:', characterId, newScore);

    logger.register(interaction.user.username, `edited_${characterType}_score`, newScore, 'Score changed');

    state.clear(userId);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[EDITING ERROR]', error);
    logger.error('Editing', `Edit score error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EDIT GUILD
// ═══════════════════════════════════════════════════════════════════

export async function showEditGuild(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const character = await CharacterRepo.findById(characterId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# 🏰 **Edit Guild**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${character.guild}\n\n` +
      'Select new guild:'
    )
    .setTimestamp();

  const guildOptions = [
    { label: 'iDolls', value: 'iDolls', emoji: '💖', description: 'Apply to iDolls' },
    { label: 'Visitor', value: 'Visitor', emoji: '👋', description: 'Guest/Visitor status' },
    { label: 'Allied', value: 'Allied', emoji: '🤝', description: 'Allied guild member' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_guild_${userId}`)
    .setPlaceholder('🏰 Select your guild')
    .addOptions(guildOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_options_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleEditGuildSelection(interaction, userId) {
  const newGuild = interaction.values[0];
  const characterId = state.get(userId, 'characterId');
  const characterType = state.get(userId, 'characterType');

  try {
    const character = await CharacterRepo.findById(characterId);
    const oldGuild = character.guild;

    await CharacterRepo.update(characterId, { guild: newGuild });
    console.log('[EDITING] Updated guild:', characterId, newGuild);

    // Handle iDolls application if switching to iDolls
    if (newGuild === 'iDolls' && oldGuild !== 'iDolls') {
      await applicationService.createApplication(userId, characterId, newGuild);
    }

    logger.register(interaction.user.username, `edited_${characterType}_guild`, newGuild, `from ${oldGuild}`);

    state.clear(userId);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[EDITING ERROR]', error);
    logger.error('Editing', `Edit guild error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EDIT BATTLE IMAGINES
// ═══════════════════════════════════════════════════════════════════

export async function showEditBattleImagines(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const character = await CharacterRepo.findById(characterId);
  const battleImagines = await BattleImagineRepo.findByCharacterId(characterId);

  const biMap = {};
  battleImagines.forEach(bi => {
    biMap[bi.name] = bi.tier;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# ⚔️ **Edit Battle Imagines**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current Battle Imagines:**\n` +
      (battleImagines.length > 0 
        ? battleImagines.map(bi => `  • ${bi.name}: ${bi.tier}`).join('\n')
        : '  None') +
      '\n\nSelect a Battle Imagine to edit:'
    )
    .setTimestamp();

  const biOptions = config.battleImagines.map(biName => ({
    label: biName,
    value: biName,
    description: biMap[biName] ? `Current: ${biMap[biName]}` : 'Not set',
    emoji: '⚔️'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_battle_imagine_${userId}`)
    .setPlaceholder('⚔️ Select Battle Imagine to edit')
    .addOptions(biOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_options_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleEditBattleImagineSelection(interaction, userId) {
  const imagineName = interaction.values[0];
  const characterId = state.get(userId, 'characterId');
  
  state.set(userId, 'editingImagine', imagineName);

  const battleImagines = await BattleImagineRepo.findByCharacterId(characterId);
  const currentBI = battleImagines.find(bi => bi.name === imagineName);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ⚔️ **Edit ${imagineName}**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      (currentBI ? `**Current Tier:** ${currentBI.tier}\n\n` : '**Not set**\n\n') +
      'Select new tier or remove:'
    )
    .setTimestamp();

  const tierOptions = [
    { label: 'Remove', value: 'remove', emoji: '❌', description: `Remove ${imagineName}` },
    { label: 'Tier 1', value: 'T1', emoji: '1️⃣', description: 'Tier 1' },
    { label: 'Tier 2', value: 'T2', emoji: '2️⃣', description: 'Tier 2' },
    { label: 'Tier 3', value: 'T3', emoji: '3️⃣', description: 'Tier 3' },
    { label: 'Tier 4', value: 'T4', emoji: '4️⃣', description: 'Tier 4' },
    { label: 'Tier 5', value: 'T5', emoji: '5️⃣', description: 'Tier 5' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_bi_tier_${userId}`)
    .setPlaceholder('⚔️ Select tier')
    .addOptions(tierOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`edit_battle_imagines_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleEditBattleImagineTierSelection(interaction, userId) {
  const tier = interaction.values[0];
  const characterId = state.get(userId, 'characterId');
  const imagineName = state.get(userId, 'editingImagine');
  const characterType = state.get(userId, 'characterType');

  try {
    if (tier === 'remove') {
      await BattleImagineRepo.delete(characterId, imagineName);
      console.log('[EDITING] Removed Battle Imagine:', characterId, imagineName);
      logger.register(interaction.user.username, `edited_${characterType}_bi`, imagineName, 'removed');
    } else {
      await BattleImagineRepo.add(characterId, imagineName, tier);
      console.log('[EDITING] Updated Battle Imagine:', characterId, imagineName, tier);
      logger.register(interaction.user.username, `edited_${characterType}_bi`, `${imagineName} ${tier}`, 'updated');
    }

    state.clear(userId);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[EDITING ERROR]', error);
    logger.error('Editing', `Edit Battle Imagine error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACK TO EDIT OPTIONS
// ═══════════════════════════════════════════════════════════════════

export async function backToEditOptions(interaction, userId) {
  const characterId = state.get(userId, 'characterId');
  const characterType = state.get(userId, 'characterType');
  await showEditOptions(interaction, userId, characterId, characterType);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  showEditCharacterChoice,
  handleCharacterToEditSelection,
  showEditIGNModal,
  handleEditIGN,
  showEditUIDModal,
  handleEditUID,
  showEditClass,
  handleEditClassSelection,
  handleEditSubclassSelection,
  showEditScore,
  handleEditScoreSelection,
  showEditGuild,
  handleEditGuildSelection,
  showEditBattleImagines,
  handleEditBattleImagineSelection,
  handleEditBattleImagineTierSelection,
  backToEditOptions
};
