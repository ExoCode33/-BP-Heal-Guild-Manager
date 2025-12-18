import { MessageFlags } from 'discord.js';
import state from '../services/state.js';
import logger from '../services/logger.js';
import config from '../config/index.js';
import { isEphemeral } from '../services/ephemeral.js';
import { REGIONS, TIMEZONE_ABBR } from '../config/game.js';
import { CharacterRepo, TimezoneRepo, BattleImagineRepo } from '../database/repositories.js';

const ephemeralFlag = { flags: MessageFlags.Ephemeral };
import { stepEmbed, errorEmbed, successEmbed, profileEmbed } from '../ui/embeds.js';
import { updateNickname } from '../services/nickname.js';
import sheets from '../services/sheets.js';
import * as ui from '../ui/components.js';
import { validateUID, formatScore } from '../ui/utils.js';

const STEPS = {
  main: ['region', 'country', 'timezone', 'class', 'subclass', 'score', 'bi', 'guild', 'ign'],
  alt: ['class', 'subclass', 'score', 'bi', 'guild', 'ign'],
  subclass: ['class', 'subclass', 'score']
};

function getStepInfo(type, step) {
  const steps = STEPS[type] || STEPS.main;
  const idx = steps.indexOf(step);
  return { current: idx + 1, total: steps.length };
}

// ✨ Animation helper - updates embed multiple times to create filling effect
async function animateStepEmbed(interaction, step, total, title, description, components) {
  const targetFilled = Math.ceil((step / total) * 10);
  
  // Animate from 0 to target, then back oscillating for healing effect
  const animationSequence = [
    ...Array.from({ length: targetFilled }, (_, i) => i + 1),  // Fill up: 1, 2, 3...
    ...Array.from({ length: targetFilled - 1 }, (_, i) => targetFilled - i - 1).reverse(), // Pulse back down
    targetFilled // Final resting position
  ];

  for (let frame = 0; frame < animationSequence.length; frame++) {
    const currentFrame = animationSequence[frame];
    const embed = stepEmbed(step, total, title, description, currentFrame);
    
    // First frame: use update, subsequent frames: use editReply for animation
    if (frame === 0) {
      await interaction.update({ embeds: [embed], components });
    } else {
      // Small delay between animation frames for smooth effect
      await new Promise(resolve => setTimeout(resolve, 80));
      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (e) {
        // Ignore errors if interaction expires
      }
    }
  }
}

export async function start(interaction, userId, type = 'main') {
  state.set(userId, 'reg', { type, step: 'region', battleImagines: [], biIndex: 0 });

  if (type === 'alt') {
    const existingTz = await TimezoneRepo.get(userId);
    if (existingTz) {
      state.update(userId, 'reg', { timezone: existingTz, step: 'class' });
      return showClass(interaction, userId, type);
    }
  }

  if (type === 'subclass') {
    state.update(userId, 'reg', { step: 'class' });
    return showClass(interaction, userId, type);
  }

  const { total } = getStepInfo(type, 'region');
  const row = ui.regionSelect(userId);
  const back = ui.backButton(`back_profile_${userId}`, '❌ Cancel');
  const components = [row, back];
  
  // ✨ Use animation for initial step
  await animateStepEmbed(
    interaction,
    1,
    total,
    '🌍 Choose Your Region',
    'Where are you playing from? 🎯',
    components
  );
}

export async function handleRegion(interaction, userId) {
  const region = interaction.values[0];
  const s = state.get(userId, 'reg');
  state.update(userId, 'reg', { region, step: 'country' });

  const { current, total } = getStepInfo(s.type, 'country');
  const row = ui.countrySelect(userId, region);
  const back = ui.backButton(`back_region_${userId}`);
  const components = [row, back];

  // ✨ Use animation for step transition
  await animateStepEmbed(
    interaction, 
    current, 
    total, 
    '🏳️ Choose Your Country', 
    `You selected: **${region}** 🎯`,
    components
  );
}

export async function handleCountry(interaction, userId) {
  const country = interaction.values[0];
  const s = state.get(userId, 'reg');
  state.update(userId, 'reg', { country, step: 'timezone' });

  const { current, total } = getStepInfo(s.type, 'timezone');
  const row = ui.timezoneSelect(userId, s.region, country);
  const back = ui.backButton(`back_country_${userId}`);
  const components = [row, back];

  // ✨ Use animation
  await animateStepEmbed(
    interaction,
    current,
    total,
    '🕐 Choose Your Timezone',
    `Location: **${country}** 📍`,
    components
  );
}

export async function handleTimezone(interaction, userId) {
  const timezone = interaction.values[0];
  const s = state.get(userId, 'reg');
  
  await TimezoneRepo.set(userId, timezone);
  state.update(userId, 'reg', { timezone, step: 'class' });

  return showClass(interaction, userId, s.type);
}

async function showClass(interaction, userId, type) {
  const s = state.get(userId, 'reg');
  const { current, total } = getStepInfo(type, 'class');
  
  let desc = 'What\'s your fighting style? ⚔️';
  if (s.timezone) {
    const abbr = TIMEZONE_ABBR[s.timezone] || s.timezone;
    desc = `📍 **${abbr}**\n\n${desc}`;
  }

  const row = ui.classSelect(userId);
  const backId = type === 'main' ? `back_timezone_${userId}` : `back_profile_${userId}`;
  const back = ui.backButton(backId, type === 'main' ? '◀️ Back' : '❌ Cancel');
  const components = [row, back];

  // ✨ Use animation
  await animateStepEmbed(
    interaction,
    current,
    total,
    '🎭 Choose Your Class',
    desc,
    components
  );
}

export async function handleClass(interaction, userId) {
  const className = interaction.values[0];
  const s = state.get(userId, 'reg');
  state.update(userId, 'reg', { className, step: 'subclass' });

  const { current, total } = getStepInfo(s.type, 'subclass');
  const row = ui.subclassSelect(userId, className);
  const back = ui.backButton(`back_class_${userId}`);
  const components = [row, back];

  // ✨ Use animation
  await animateStepEmbed(
    interaction,
    current,
    total,
    '📋 Choose Your Subclass',
    `Class: **${className}**\n\nPick your playstyle~ 🎮`,
    components
  );
}

export async function handleSubclass(interaction, userId) {
  const subclass = interaction.values[0];
  const s = state.get(userId, 'reg');
  state.update(userId, 'reg', { subclass, step: 'score' });

  const { current, total } = getStepInfo(s.type, 'score');
  const row = ui.scoreSelect(userId);
  const back = ui.backButton(`back_subclass_${userId}`);
  const components = [row, back];

  // ✨ Use animation
  await animateStepEmbed(
    interaction,
    current,
    total,
    '💪 Choose Your Score',
    `Subclass: **${subclass}**\n\nHow strong are you? 💪`,
    components
  );
}

export async function handleScore(interaction, userId) {
  const score = interaction.values[0];
  const s = state.get(userId, 'reg');
  state.update(userId, 'reg', { score, step: 'bi' });

  if (s.type === 'subclass') {
    return completeSubclass(interaction, userId);
  }

  if (config.battleImagines.length === 0) {
    state.update(userId, 'reg', { step: 'guild' });
    return showGuild(interaction, userId, s.type);
  }

  return showBattleImagine(interaction, userId);
}

async function showBattleImagine(interaction, userId) {
  const s = state.get(userId, 'reg');
  const idx = s.biIndex || 0;

  if (idx >= config.battleImagines.length) {
    state.update(userId, 'reg', { step: 'guild' });
    return showGuild(interaction, userId, s.type);
  }

  const imagine = config.battleImagines[idx];
  const baseStep = s.type === 'alt' ? 4 : 7;
  const stepNum = baseStep + idx;
  const total = STEPS[s.type].length;

  const logo = imagine.logo ? `<:bi:${imagine.logo}>` : '⚔️';
  const row = ui.battleImagineSelect(userId, imagine);
  const back = ui.backButton(idx === 0 ? `back_score_${userId}` : `back_bi_${userId}`);
  const components = [row, back];

  // ✨ Use animation
  await animateStepEmbed(
    interaction,
    stepNum,
    total,
    `${logo} Battle Imagine - ${imagine.name}`,
    `Do you own **${imagine.name}**? 🎯\n\nSelect your highest tier~ ⭐`,
    components
  );
}

export async function handleBattleImagine(interaction, userId) {
  const tier = interaction.values[0];
  const s = state.get(userId, 'reg');
  const idx = s.biIndex || 0;

  if (tier !== 'skip') {
    const imagine = config.battleImagines[idx];
    const bis = s.battleImagines || [];
    bis.push({ name: imagine.name, tier });
    state.update(userId, 'reg', { battleImagines: bis });
  }

  state.update(userId, 'reg', { biIndex: idx + 1 });
  return showBattleImagine(interaction, userId);
}

async function showGuild(interaction, userId, type) {
  const s = state.get(userId, 'reg');
  const { current, total } = getStepInfo(type, 'guild');
  
  const row = ui.guildSelect(userId);
  const back = ui.backButton(`back_bi_${userId}`);
  const components = [row, back];

  // ✨ Use animation
  await animateStepEmbed(
    interaction,
    current,
    total,
    '🏰 Choose Your Guild',
    'Which guild is your home? 🎪',
    components
  );
}

export async function handleGuild(interaction, userId) {
  const guild = interaction.values[0];
  state.update(userId, 'reg', { guild, step: 'ign' });
  
  await interaction.showModal(ui.ignModal(userId));
}

export async function handleIGN(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const uid = interaction.fields.getTextInputValue('uid').trim();
  const s = state.get(userId, 'reg');

  if (!validateUID(uid)) {
    const embed = errorEmbed(`**UID must contain only numbers.**\n\nYou entered: \`${uid}\``);
    const retry = ui.backButton(`retry_ign_${userId}`, '✏️ Retry');
    return interaction.reply({ embeds: [embed], components: [retry], ...ephemeralFlag });
  }

  try {
    const char = await CharacterRepo.create({
      userId,
      ign,
      uid,
      className: s.className,
      subclass: s.subclass,
      abilityScore: s.score,
      guild: s.guild,
      characterType: s.type,
      parentId: s.parentId
    });

    for (const bi of (s.battleImagines || [])) {
      await BattleImagineRepo.add(char.id, bi.name, bi.tier);
    }

    if (s.type === 'main' && config.sync.nicknameEnabled) {
      await updateNickname(interaction.client, config.discord.guildId, userId, ign);
    }

    state.clear(userId, 'reg');
    logger.register(interaction.user.username, s.type, ign, s.className);

    const chars = await CharacterRepo.findAllByUser(userId);
    const embed = await profileEmbed(interaction.user, chars, interaction);
    const buttons = ui.profileButtons(userId, true);

    const isEph = await isEphemeral(interaction.guildId, 'character');
    
    await interaction.reply({ embeds: [embed], components: buttons, ...(isEph ? ephemeralFlag : {}) });

    sheets.sync(await CharacterRepo.findAll(), interaction.client);
  } catch (e) {
    logger.error('Registration', 'Failed to create character', e);
    await interaction.reply({ embeds: [errorEmbed('Failed to save character. Please try again.')], ...ephemeralFlag });
  }
}

async function completeSubclass(interaction, userId) {
  const s = state.get(userId, 'reg');

  try {
    const parent = await CharacterRepo.findById(s.parentId);
    if (!parent) throw new Error('Parent not found');

    await CharacterRepo.create({
      userId,
      ign: parent.ign,
      uid: parent.uid,
      className: s.className,
      subclass: s.subclass,
      abilityScore: s.score,
      guild: parent.guild,
      characterType: s.parentType === 'main' ? 'main_subclass' : 'alt_subclass',
      parentId: s.parentId
    });

    state.clear(userId, 'reg');
    logger.register(interaction.user.username, 'subclass', s.className, s.subclass);

    const chars = await CharacterRepo.findAllByUser(userId);
    const embed = await profileEmbed(interaction.user, chars, interaction);
    const buttons = ui.profileButtons(userId, true);

    await interaction.update({ embeds: [embed], components: buttons });
    sheets.sync(await CharacterRepo.findAll(), interaction.client);
  } catch (e) {
    logger.error('Registration', 'Failed to create subclass', e);
    await interaction.reply({ embeds: [errorEmbed('Failed to save subclass.')], ephemeral: true });
  }
}

export async function backToRegion(interaction, userId) {
  const s = state.get(userId, 'reg');
  return start(interaction, userId, s?.type || 'main');
}

export async function backToCountry(interaction, userId) {
  const s = state.get(userId, 'reg');
  if (!s?.region) return backToRegion(interaction, userId);
  
  interaction.values = [s.region];
  return handleRegion(interaction, userId);
}

export async function backToTimezone(interaction, userId) {
  const s = state.get(userId, 'reg');
  if (!s?.country) return backToCountry(interaction, userId);
  
  interaction.values = [s.country];
  return handleCountry(interaction, userId);
}

export async function backToClass(interaction, userId) {
  const s = state.get(userId, 'reg');
  if (!s?.timezone) return backToTimezone(interaction, userId);
  
  interaction.values = [s.timezone];
  return handleTimezone(interaction, userId);
}

export async function backToSubclass(interaction, userId) {
  const s = state.get(userId, 'reg');
  if (!s?.className) return backToClass(interaction, userId);
  
  interaction.values = [s.className];
  return handleClass(interaction, userId);
}

export async function backToScore(interaction, userId) {
  const s = state.get(userId, 'reg');
  if (!s?.subclass) return backToSubclass(interaction, userId);
  
  interaction.values = [s.subclass];
  return handleSubclass(interaction, userId);
}

export async function backToBattleImagine(interaction, userId) {
  const s = state.get(userId, 'reg');
  const idx = (s?.biIndex || 1) - 1;
  
  if (idx <= 0) {
    return backToScore(interaction, userId);
  }
  
  if (s.battleImagines?.length > 0) {
    s.battleImagines.pop();
  }
  
  state.update(userId, 'reg', { biIndex: idx - 1, battleImagines: s.battleImagines });
  return showBattleImagine(interaction, userId);
}

export async function retryIGN(interaction, userId) {
  await interaction.showModal(ui.ignModal(userId));
}
