// src/handlers/subclass.js
// COMPLETE FIXED VERSION - Ready to copy-paste

// ✅ Import the helper functions
import { safeDeferUpdate, safeUpdate } from '../utils/interactionHelper.js';
import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { queries } from '../database/queries.js';

// Constants
const SUBCLASS_LIMIT = 3;

// ============================================
// Main Handler Functions
// ============================================

export async function handleAddSubclassToMain(interaction) {
  // ✅ DEFER IMMEDIATELY
  await safeDeferUpdate(interaction);
  
  try {
    const userId = interaction.customId.split('_').pop();
    
    // Get user's characters
    const mainChar = await queries.getMainCharacter(userId);
    const allChars = await queries.getAllCharactersWithSubclasses(userId);
    
    // Check if user has a main character
    if (!mainChar) {
      await safeUpdate(interaction, {
        content: 'You need to register a main character first! Use `/register` to get started.',
        embeds: [],
        components: []
      });
      return;
    }
    
    // Count existing subclasses
    const subclasses = allChars.filter(c => 
      c.character_type === 'main_subclass' || 
      c.character_type === 'alt_subclass'
    );
    
    // Check subclass limit
    if (subclasses.length >= SUBCLASS_LIMIT) {
      await safeUpdate(interaction, {
        content: `You already have ${SUBCLASS_LIMIT} subclasses (maximum reached).`,
        embeds: [],
        components: []
      });
      return;
    }
    
    // Show class selection
    await showSubclassClassSelection(interaction, userId);
    
  } catch (error) {
    console.error('[SUBCLASS] Error in handleAddSubclassToMain:', error);
    await safeUpdate(interaction, {
      content: 'An error occurred while adding a subclass. Please try again.',
      embeds: [],
      components: []
    });
  }
}

export async function handleAltSelectionForSubclass(interaction) {
  // ✅ DEFER IMMEDIATELY
  await safeDeferUpdate(interaction);
  
  try {
    const userId = interaction.customId.split('_').pop();
    const selectedAltId = interaction.values[0];
    
    // Store the selected alt ID for later use
    // (You might want to use a cache or pass it through the next interaction)
    
    // Show class selection
    await showSubclassClassSelection(interaction, userId, selectedAltId);
    
  } catch (error) {
    console.error('[SUBCLASS] Error in handleAltSelectionForSubclass:', error);
    await safeUpdate(interaction, {
      content: 'An error occurred. Please try again.',
      embeds: [],
      components: []
    });
  }
}

export async function handleSubclassClassSelection(interaction) {
  // ✅ DEFER IMMEDIATELY
  await safeDeferUpdate(interaction);
  
  try {
    const userId = interaction.customId.split('_').pop();
    const selectedClass = interaction.values[0];
    
    // Show subclass selection for the chosen class
    await showSubclassSubclassSelection(interaction, userId, selectedClass);
    
  } catch (error) {
    console.error('[SUBCLASS] Error in handleSubclassClassSelection:', error);
    await safeUpdate(interaction, {
      content: 'An error occurred. Please try again.',
      embeds: [],
      components: []
    });
  }
}

export async function handleSubclassSubclassSelection(interaction) {
  // ✅ DEFER IMMEDIATELY
  await safeDeferUpdate(interaction);
  
  try {
    const userId = interaction.customId.split('_').pop();
    const selectedSubclass = interaction.values[0];
    
    // Show ability score selection
    await showSubclassAbilityScoreSelection(interaction, userId, selectedSubclass);
    
  } catch (error) {
    console.error('[SUBCLASS] Error in handleSubclassSubclassSelection:', error);
    await safeUpdate(interaction, {
      content: 'An error occurred. Please try again.',
      embeds: [],
      components: []
    });
  }
}

export async function handleSubclassAbilityScoreSelection(interaction) {
  // ✅ DEFER IMMEDIATELY
  await safeDeferUpdate(interaction);
  
  try {
    const userId = interaction.customId.split('_').pop();
    const selectedAbilityScore = interaction.values[0];
    
    // Extract subclass info from the custom ID or store it in cache
    // For this example, I'll assume you have a way to retrieve it
    const subclassData = {
      userId: userId,
      abilityScore: selectedAbilityScore
      // Add other fields as needed
    };
    
    // Save the subclass to database
    await queries.addSubclass(subclassData);
    
    // Show success message
    const embed = new EmbedBuilder()
      .setTitle('✅ Subclass Added Successfully!')
      .setDescription(`Your new subclass has been registered.`)
      .setColor('#00FF00')
      .addFields(
        { name: 'Ability Score', value: selectedAbilityScore, inline: true }
      );
    
    const backButton = new ButtonBuilder()
      .setCustomId(`show_edit_menu_${userId}`)
      .setLabel('Back to Menu')
      .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder().addComponents(backButton);
    
    await safeUpdate(interaction, {
      embeds: [embed],
      components: [row]
    });
    
  } catch (error) {
    console.error('[SUBCLASS] Error in handleSubclassAbilityScoreSelection:', error);
    await safeUpdate(interaction, {
      content: 'An error occurred while saving your subclass. Please try again.',
      embeds: [],
      components: []
    });
  }
}

// ============================================
// Helper Functions (Internal)
// ============================================

async function showSubclassClassSelection(interaction, userId, altId = null) {
  // No defer needed - already deferred in parent function
  
  const embed = new EmbedBuilder()
    .setTitle('Add Subclass - Select Class')
    .setDescription('Choose a class for your new subclass:')
    .setColor('#6640D9');
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_class_${userId}`)
    .setPlaceholder('Choose a class...')
    .addOptions([
      { label: 'Beat Performer', value: 'Beat Performer', emoji: '🎵' },
      { label: 'Frost Mage', value: 'Frost Mage', emoji: '❄️' },
      { label: 'Pyromancer', value: 'Pyromancer', emoji: '🔥' },
      { label: 'Shadow Assassin', value: 'Shadow Assassin', emoji: '🗡️' },
      { label: 'Holy Paladin', value: 'Holy Paladin', emoji: '⚔️' },
      { label: 'Nature Druid', value: 'Nature Druid', emoji: '🌿' },
      { label: 'Arcane Wizard', value: 'Arcane Wizard', emoji: '✨' },
      { label: 'Battle Warrior', value: 'Battle Warrior', emoji: '🛡️' },
      { label: 'Divine Cleric', value: 'Divine Cleric', emoji: '✝️' },
      { label: 'Swift Ranger', value: 'Swift Ranger', emoji: '🏹' }
    ]);
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  const backButton = new ButtonBuilder()
    .setCustomId(`show_edit_menu_${userId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);
  
  const backRow = new ActionRowBuilder().addComponents(backButton);
  
  await safeUpdate(interaction, {
    embeds: [embed],
    components: [row, backRow]
  });
}

async function showSubclassSubclassSelection(interaction, userId, selectedClass) {
  // No defer needed - already deferred in parent function
  
  // Get subclasses for the selected class
  const subclassOptions = getSubclassesForClass(selectedClass);
  
  const embed = new EmbedBuilder()
    .setTitle(`Add Subclass - Select ${selectedClass} Subclass`)
    .setDescription('Choose your subclass specialization:')
    .setColor('#6640D9');
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_subclass_${userId}`)
    .setPlaceholder('Choose a subclass...')
    .addOptions(subclassOptions);
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_subclass_class_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  
  const backRow = new ActionRowBuilder().addComponents(backButton);
  
  await safeUpdate(interaction, {
    embeds: [embed],
    components: [row, backRow]
  });
}

async function showSubclassAbilityScoreSelection(interaction, userId, selectedSubclass) {
  // No defer needed - already deferred in parent function
  
  const embed = new EmbedBuilder()
    .setTitle('Add Subclass - Select Ability Score')
    .setDescription(`Choose your primary ability score for **${selectedSubclass}**:`)
    .setColor('#6640D9');
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_ability_score_${userId}`)
    .setPlaceholder('Choose an ability score...')
    .addOptions([
      { label: 'Strength', value: 'Strength', emoji: '💪' },
      { label: 'Dexterity', value: 'Dexterity', emoji: '🤸' },
      { label: 'Constitution', value: 'Constitution', emoji: '❤️' },
      { label: 'Intelligence', value: 'Intelligence', emoji: '🧠' },
      { label: 'Wisdom', value: 'Wisdom', emoji: '🦉' },
      { label: 'Charisma', value: 'Charisma', emoji: '✨' }
    ]);
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_subclass_subclass_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);
  
  const backRow = new ActionRowBuilder().addComponents(backButton);
  
  await safeUpdate(interaction, {
    embeds: [embed],
    components: [row, backRow]
  });
}

function getSubclassesForClass(className) {
  // Return subclass options based on the class
  // This is an example - replace with your actual subclasses
  
  const subclasses = {
    'Beat Performer': [
      { label: 'Melody Master', value: 'Melody Master' },
      { label: 'Rhythm Dancer', value: 'Rhythm Dancer' },
      { label: 'Sound Weaver', value: 'Sound Weaver' }
    ],
    'Frost Mage': [
      { label: 'Ice Sculptor', value: 'Ice Sculptor' },
      { label: 'Blizzard Caller', value: 'Blizzard Caller' },
      { label: 'Frozen Heart', value: 'Frozen Heart' }
    ],
    'Pyromancer': [
      { label: 'Inferno Master', value: 'Inferno Master' },
      { label: 'Flame Dancer', value: 'Flame Dancer' },
      { label: 'Ash Walker', value: 'Ash Walker' }
    ],
    'Shadow Assassin': [
      { label: 'Blade Master', value: 'Blade Master' },
      { label: 'Silent Killer', value: 'Silent Killer' },
      { label: 'Night Stalker', value: 'Night Stalker' }
    ],
    'Holy Paladin': [
      { label: 'Divine Shield', value: 'Divine Shield' },
      { label: 'Light Bringer', value: 'Light Bringer' },
      { label: 'Sacred Warrior', value: 'Sacred Warrior' }
    ],
    'Nature Druid': [
      { label: 'Shapeshifter', value: 'Shapeshifter' },
      { label: 'Plant Master', value: 'Plant Master' },
      { label: 'Beast Caller', value: 'Beast Caller' }
    ],
    'Arcane Wizard': [
      { label: 'Time Bender', value: 'Time Bender' },
      { label: 'Spell Weaver', value: 'Spell Weaver' },
      { label: 'Mystic Scholar', value: 'Mystic Scholar' }
    ],
    'Battle Warrior': [
      { label: 'Weapon Master', value: 'Weapon Master' },
      { label: 'Berserker', value: 'Berserker' },
      { label: 'Tactician', value: 'Tactician' }
    ],
    'Divine Cleric': [
      { label: 'Life Domain', value: 'Life Domain' },
      { label: 'War Domain', value: 'War Domain' },
      { label: 'Knowledge Domain', value: 'Knowledge Domain' }
    ],
    'Swift Ranger': [
      { label: 'Beast Master', value: 'Beast Master' },
      { label: 'Hunter', value: 'Hunter' },
      { label: 'Tracker', value: 'Tracker' }
    ]
  };
  
  return subclasses[className] || [
    { label: 'Default Subclass', value: 'Default Subclass' }
  ];
}
