import { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import stateManager from '../utils/stateManager.js';
import config from '../utils/config.js';
import db from '../services/database.js';
import logger from '../utils/logger.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import sheetsService from '../services/sheets.js';

function createRegEmbed(step, total, title, description) {
  return new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`# **${title}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}\n\n*Step ${step} of ${total}*`)
    .setTimestamp();
}

export async function handleRegisterMain(interaction, userId) {
  const state = stateManager.getRegistrationState(userId) || {};
  
  console.log('[REGISTRATION] Starting registration for user:', userId);
  console.log('[REGISTRATION] State:', JSON.stringify(state, null, 2));
  
  if (!state.step) {
    stateManager.setRegistrationState(userId, { 
      step: 'region',
      characterType: state.characterType || 'main'
    });
  }

  const embed = createRegEmbed(1, 7, '🌍 Select Your Region', 'Choose your region to continue:');

  const regions = [
    { label: '🌎 North America', value: 'North America', emoji: '🌎' },
    { label: '🌍 Europe', value: 'Europe', emoji: '🌍' },
    { label: '🌏 Asia', value: 'Asia', emoji: '🌏' },
    { label: '🦘 Oceania', value: 'Oceania', emoji: '🦘' },
    { label: '🦁 Africa', value: 'Africa', emoji: '🦁' },
    { label: '🌎 South America', value: 'South America', emoji: '🌎' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_region_${userId}`)
    .setPlaceholder('🌍 Choose your region')
    .addOptions(regions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [row] });
  } else {
    await interaction.update({ embeds: [embed], components: [row] });
  }
}

export async function handleRegionSelect(interaction, userId) {
  const region = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Region selected:', region);
  console.log('[REGISTRATION] Current state:', JSON.stringify(state, null, 2));
  
  state.region = region;
  state.step = 'country';
  stateManager.setRegistrationState(userId, state);

  const embed = createRegEmbed(2, 7, '🗺️ Select Your Country', 'Choose your country:');

  const countryOptions = getCountriesByRegion(region);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_country_${userId}`)
    .setPlaceholder('🗺️ Choose your country')
    .addOptions(countryOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleCountrySelect(interaction, userId) {
  const country = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Country selected:', country);
  
  state.country = country;
  state.step = 'timezone';
  stateManager.setRegistrationState(userId, state);

  const embed = createRegEmbed(3, 7, '🕐 Select Your Timezone', 'Choose your timezone:');

  const timezoneOptions = getTimezonesByCountry(country, state.region);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_${userId}`)
    .setPlaceholder('🕐 Choose your timezone')
    .addOptions(timezoneOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleTimezoneSelect(interaction, userId) {
  const timezone = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Timezone selected:', timezone);
  
  state.timezone = timezone;
  state.step = 'class';
  stateManager.setRegistrationState(userId, state);

  await db.setUserTimezone(userId, timezone);
  logger.success(`Set timezone for user ${userId}: ${timezone}`);

  const embed = createRegEmbed(4, 7, '⚔️ Select Your Class', 'Choose your main class:');

  const classOptions = config.classes.map(cls => ({
    label: cls.name,
    value: cls.name,
    description: `${cls.role} - ${cls.description}`,
    emoji: cls.role === 'Tank' ? '🛡️' : cls.role === 'DPS' ? '⚔️' : '💚'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('⚔️ Choose your class')
    .addOptions(classOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleClassSelect(interaction, userId) {
  const className = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Class selected:', className);
  
  state.class = className;
  state.step = 'subclass';
  stateManager.setRegistrationState(userId, state);

  const embed = createRegEmbed(5, 7, '🎭 Select Your Subclass', `Choose your ${className} subclass:`);

  const selectedClass = config.classes.find(c => c.name === className);
  const subclassOptions = selectedClass.subclasses.map(sub => ({
    label: sub,
    value: sub,
    emoji: selectedClass.role === 'Tank' ? '🛡️' : selectedClass.role === 'DPS' ? '⚔️' : '💚'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_${userId}`)
    .setPlaceholder('🎭 Choose your subclass')
    .addOptions(subclassOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleSubclassSelect(interaction, userId) {
  const subclass = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Subclass selected:', subclass);
  
  state.subclass = subclass;
  state.step = 'abilityScore';
  stateManager.setRegistrationState(userId, state);

  const embed = createRegEmbed(6, 7, '💪 Select Your Ability Score', 'Choose your current ability score range:');

  const scoreOptions = [
    { label: '≤10k', value: '10000', description: '≤10k power level' },
    { label: '11-12k', value: '11500', description: '11-12k power level' },
    { label: '13-15k', value: '14000', description: '13-15k power level' },
    { label: '16-18k', value: '17000', description: '16-18k power level' },
    { label: '19-21k', value: '20000', description: '19-21k power level' },
    { label: '22-24k', value: '23000', description: '22-24k power level' },
    { label: '25-27k', value: '26000', description: '25-27k power level' },
    { label: '28-29k', value: '28500', description: '28-29k power level' },
    { label: '30-32k', value: '31000', description: '30-32k power level' },
    { label: '32-34k', value: '33000', description: '32-34k power level' },
    { label: '35-37k', value: '36000', description: '35-37k power level' },
    { label: '38-40k', value: '39000', description: '38-40k power level' },
    { label: '41-43k', value: '42000', description: '41-43k power level' },
    { label: '44-46k', value: '45000', description: '44-46k power level' },
    { label: '47-49k', value: '48000', description: '47-49k power level' },
    { label: '50-52k', value: '51000', description: '50-52k power level' },
    { label: '53-55k', value: '54000', description: '53-55k power level' },
    { label: '56k+', value: '57000', description: '56k+ power level' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_ability_score_${userId}`)
    .setPlaceholder('💪 Choose your score')
    .addOptions(scoreOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleAbilityScoreSelect(interaction, userId) {
  const score = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Score selected:', score);
  
  state.abilityScore = score;
  state.step = 'guild';
  stateManager.setRegistrationState(userId, state);

  const embed = createRegEmbed(7, 7, '🏰 Select Your Guild', 'Choose your guild:');

  const guildOptions = config.guilds.map(guild => ({
    label: guild.name,
    value: guild.name,
    description: `Join ${guild.name}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_${userId}`)
    .setPlaceholder('🏰 Choose your guild')
    .addOptions(guildOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleGuildSelect(interaction, userId) {
  const guild = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  
  console.log('[REGISTRATION] Guild selected:', guild);
  
  state.guild = guild;
  state.step = 'ign';
  stateManager.setRegistrationState(userId, state);

  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('Enter Your IGN');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your character name')
    .setRequired(true)
    .setMaxLength(50);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleIGNModal(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const state = stateManager.getRegistrationState(userId);

  console.log('[REGISTRATION] IGN entered:', ign);
  console.log('[REGISTRATION] Final state:', JSON.stringify(state, null, 2));
  console.log('[REGISTRATION] Character type will be:', state.characterType || 'main');

  try {
    const characterData = {
      userId,
      ign,
      guild: state.guild,
      class: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore,
      characterType: state.characterType || 'main'
    };

    console.log('[REGISTRATION] Creating character with data:', JSON.stringify(characterData, null, 2));

    await db.createCharacter(characterData);
    stateManager.clearRegistrationState(userId);

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    console.log('[REGISTRATION] After creation - Main:', mainChar?.ign, '| Alts:', alts.length, '| Subs:', subs.length);

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.reply({ 
      embeds: [embed], 
      components: buttons,
      ephemeral: config.ephemeral.registerChar
    });

    const charType = characterData.characterType;
    logger.logAction(interaction.user.tag, `registered ${charType} character`, `${ign} - ${state.class}`);
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    logger.error(`Registration error: ${error.message}`, error);
    await interaction.reply({
      content: '❌ Something went wrong. Please try again!',
      ephemeral: true
    });
  }
}

function getCountriesByRegion(region) {
  const countries = {
    'North America': [
      { label: '🇺🇸 United States', value: '🇺🇸 United States' },
      { label: '🇨🇦 Canada', value: '🇨🇦 Canada' },
      { label: '🇲🇽 Mexico', value: '🇲🇽 Mexico' }
    ],
    'Europe': [
      { label: '🇬🇧 United Kingdom', value: '🇬🇧 United Kingdom' },
      { label: '🇫🇷 France', value: '🇫🇷 France' },
      { label: '🇩🇪 Germany', value: '🇩🇪 Germany' },
      { label: '🇪🇸 Spain', value: '🇪🇸 Spain' },
      { label: '🇮🇹 Italy', value: '🇮🇹 Italy' },
      { label: '🇳🇱 Netherlands', value: '🇳🇱 Netherlands' },
      { label: '🇵🇱 Poland', value: '🇵🇱 Poland' },
      { label: '🇸🇪 Sweden', value: '🇸🇪 Sweden' },
      { label: '🇹🇷 Turkey', value: '🇹🇷 Turkey' },
      { label: '🇷🇺 Russia', value: '🇷🇺 Russia' }
    ],
    'Asia': [
      { label: '🇯🇵 Japan', value: '🇯🇵 Japan' },
      { label: '🇰🇷 South Korea', value: '🇰🇷 South Korea' },
      { label: '🇨🇳 China', value: '🇨🇳 China' },
      { label: '🇮🇳 India', value: '🇮🇳 India' },
      { label: '🇸🇬 Singapore', value: '🇸🇬 Singapore' },
      { label: '🇹🇭 Thailand', value: '🇹🇭 Thailand' },
      { label: '🇻🇳 Vietnam', value: '🇻🇳 Vietnam' },
      { label: '🇵🇭 Philippines', value: '🇵🇭 Philippines' }
    ],
    'Oceania': [
      { label: '🇦🇺 Australia', value: '🇦🇺 Australia' },
      { label: '🇳🇿 New Zealand', value: '🇳🇿 New Zealand' }
    ],
    'Africa': [
      { label: '🇿🇦 South Africa', value: '🇿🇦 South Africa' },
      { label: '🇪🇬 Egypt', value: '🇪🇬 Egypt' },
      { label: '🇳🇬 Nigeria', value: '🇳🇬 Nigeria' }
    ],
    'South America': [
      { label: '🇧🇷 Brazil', value: '🇧🇷 Brazil' },
      { label: '🇦🇷 Argentina', value: '🇦🇷 Argentina' },
      { label: '🇨🇱 Chile', value: '🇨🇱 Chile' }
    ]
  };
  
  return countries[region] || [];
}

function getTimezonesByCountry(country, region) {
  const timezones = {
    '🇺🇸 United States': [
      { label: 'EST (Eastern)', value: 'America/New_York', description: 'New York, Miami, Boston' },
      { label: 'CST (Central)', value: 'America/Chicago', description: 'Chicago, Dallas, Houston' },
      { label: 'MST (Mountain)', value: 'America/Denver', description: 'Denver, Phoenix, Salt Lake City' },
      { label: 'PST (Pacific)', value: 'America/Los_Angeles', description: 'LA, Seattle, San Francisco' },
      { label: 'AKST (Alaska)', value: 'America/Anchorage', description: 'Anchorage, Juneau' },
      { label: 'HST (Hawaii)', value: 'Pacific/Honolulu', description: 'Honolulu' }
    ],
    '🇨🇦 Canada': [
      { label: 'NST (Newfoundland)', value: 'America/St_Johns', description: "St. John's" },
      { label: 'AST (Atlantic)', value: 'America/Halifax', description: 'Halifax, Moncton' },
      { label: 'EST (Eastern)', value: 'America/Toronto', description: 'Toronto, Ottawa, Montreal' },
      { label: 'CST (Central)', value: 'America/Winnipeg', description: 'Winnipeg, Regina' },
      { label: 'MST (Mountain)', value: 'America/Edmonton', description: 'Edmonton, Calgary' },
      { label: 'PST (Pacific)', value: 'America/Vancouver', description: 'Vancouver, Victoria' }
    ],
    '🇲🇽 Mexico': [
      { label: 'CST', value: 'America/Mexico_City', description: 'Mexico City, Guadalajara' }
    ],
    '🇬🇧 United Kingdom': [
      { label: 'GMT', value: 'Europe/London', description: 'London, Edinburgh, Manchester' }
    ],
    '🇫🇷 France': [
      { label: 'CET', value: 'Europe/Paris', description: 'Paris, Lyon, Marseille' }
    ],
    '🇩🇪 Germany': [
      { label: 'CET', value: 'Europe/Berlin', description: 'Berlin, Munich, Hamburg' }
    ],
    '🇪🇸 Spain': [
      { label: 'CET', value: 'Europe/Madrid', description: 'Madrid, Barcelona, Valencia' }
    ],
    '🇮🇹 Italy': [
      { label: 'CET', value: 'Europe/Rome', description: 'Rome, Milan, Naples' }
    ],
    '🇳🇱 Netherlands': [
      { label: 'CET', value: 'Europe/Amsterdam', description: 'Amsterdam, Rotterdam' }
    ],
    '🇵🇱 Poland': [
      { label: 'CET', value: 'Europe/Warsaw', description: 'Warsaw, Krakow' }
    ],
    '🇸🇪 Sweden': [
      { label: 'CET', value: 'Europe/Stockholm', description: 'Stockholm, Gothenburg' }
    ],
    '🇹🇷 Turkey': [
      { label: 'TRT', value: 'Europe/Istanbul', description: 'Istanbul, Ankara' }
    ],
    '🇷🇺 Russia': [
      { label: 'MSK (Moscow)', value: 'Europe/Moscow', description: 'Moscow, St. Petersburg' }
    ],
    '🇯🇵 Japan': [
      { label: 'JST', value: 'Asia/Tokyo', description: 'Tokyo, Osaka, Kyoto' }
    ],
    '🇰🇷 South Korea': [
      { label: 'KST', value: 'Asia/Seoul', description: 'Seoul, Busan' }
    ],
    '🇨🇳 China': [
      { label: 'CST', value: 'Asia/Shanghai', description: 'Beijing, Shanghai, Guangzhou' }
    ],
    '🇮🇳 India': [
      { label: 'IST', value: 'Asia/Kolkata', description: 'Mumbai, Delhi, Bangalore' }
    ],
    '🇸🇬 Singapore': [
      { label: 'SGT', value: 'Asia/Singapore', description: 'Singapore' }
    ],
    '🇹🇭 Thailand': [
      { label: 'ICT', value: 'Asia/Bangkok', description: 'Bangkok' }
    ],
    '🇻🇳 Vietnam': [
      { label: 'ICT', value: 'Asia/Ho_Chi_Minh', description: 'Ho Chi Minh City, Hanoi' }
    ],
    '🇵🇭 Philippines': [
      { label: 'PHT', value: 'Asia/Manila', description: 'Manila, Cebu' }
    ],
    '🇦🇺 Australia': [
      { label: 'AEDT (Sydney)', value: 'Australia/Sydney', description: 'Sydney, Melbourne' },
      { label: 'AEST (Brisbane)', value: 'Australia/Brisbane', description: 'Brisbane' },
      { label: 'ACST (Adelaide)', value: 'Australia/Adelaide', description: 'Adelaide' },
      { label: 'AWST (Perth)', value: 'Australia/Perth', description: 'Perth' }
    ],
    '🇳🇿 New Zealand': [
      { label: 'NZDT', value: 'Pacific/Auckland', description: 'Auckland, Wellington' }
    ],
    '🇿🇦 South Africa': [
      { label: 'SAST', value: 'Africa/Johannesburg', description: 'Johannesburg, Cape Town' }
    ],
    '🇪🇬 Egypt': [
      { label: 'EET', value: 'Africa/Cairo', description: 'Cairo' }
    ],
    '🇳🇬 Nigeria': [
      { label: 'WAT', value: 'Africa/Lagos', description: 'Lagos' }
    ],
    '🇧🇷 Brazil': [
      { label: 'BRT', value: 'America/Sao_Paulo', description: 'São Paulo, Rio de Janeiro' }
    ],
    '🇦🇷 Argentina': [
      { label: 'ART', value: 'America/Argentina/Buenos_Aires', description: 'Buenos Aires' }
    ],
    '🇨🇱 Chile': [
      { label: 'CLT', value: 'America/Santiago', description: 'Santiago' }
    ]
  };
  
  return timezones[country] || [{ label: 'UTC', value: 'UTC', description: 'Coordinated Universal Time' }];
}

export default {
  handleRegisterMain,
  handleRegionSelect,
  handleCountrySelect,
  handleTimezoneSelect,
  handleClassSelect,
  handleSubclassSelect,
  handleAbilityScoreSelect,
  handleGuildSelect,
  handleIGNModal
};
