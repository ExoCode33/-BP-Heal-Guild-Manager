import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

export async function handleRemoveMain(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Get main character
    const mainChar = await queries.getMainCharacter(userId);
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('You don\'t have a main character to remove!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if they have alts
    const alts = await queries.getAltCharacters(userId);
    
    // Show confirmation
    await showRemoveMainConfirmation(interaction, userId, mainChar, alts.length);
    
  } catch (error) {
    console.error('Error in handleRemoveMain:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showRemoveMainConfirmation(interaction, userId, mainChar, altCount) {
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_main_${userId}`)
    .setLabel('Yes, Remove Main Character')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('✅');

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_main_${userId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Confirm Removal')
    .setDescription('Are you sure you want to remove your main character?')
    .addFields(
      { name: '🎮 IGN', value: mainChar.ign, inline: true },
      { name: '🎭 Class', value: `${mainChar.class} (${mainChar.subclass})`, inline: true },
      { name: '⚔️ Role', value: mainChar.role, inline: true }
    )
    .setFooter({ text: '⚠️ This action cannot be undone!' })
    .setTimestamp();

  if (altCount > 0) {
    embed.addFields({
      name: '⚠️ Warning',
      value: `This will also remove all ${altCount} alt character${altCount !== 1 ? 's' : ''} associated with this main character!`,
      inline: false
    });
  }

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { mainChar, type: 'main' });
}

export async function handleConfirmRemoveMain(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.mainChar) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    // Delete the main character (cascade will delete alts)
    await queries.deleteMainCharacter(userId);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Character Removed')
      .setDescription('Your main character (and all alt characters) have been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.mainChar.ign,
        inline: false
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // Return to main menu after a brief delay - using followUp instead of update
    setTimeout(async () => {
      try {
        const editMemberDetails = await import('../commands/edit-member-details.js');
        
        // Fetch the original message and edit it directly
        const message = await interaction.fetchReply();
        
        // Get the menu content
        const mainChar = await queries.getMainCharacter(userId);
        const alts = mainChar ? await queries.getAltCharacters(userId) : [];

        const menuEmbed = new EmbedBuilder()
          .setColor('#6640D9')
          .setTitle('📋 Member Details Management')
          .setDescription('Choose what you\'d like to do:')
          .setFooter({ text: '💡 Select an action below' })
          .setTimestamp();

        if (mainChar) {
          menuEmbed.addFields(
            { 
              name: '⭐ Main Character', 
              value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}`, 
              inline: true 
            }
          );
          
          if (alts.length > 0) {
            menuEmbed.addFields({
              name: '📋 Alt Characters',
              value: alts.map(alt => `• ${alt.ign} (${alt.class})`).join('\n'),
              inline: true
            });
          }
        } else {
          menuEmbed.addFields({
            name: '📝 Status',
            value: 'No main character registered',
            inline: false
          });
        }

        // Build button rows
        const rows = [];
        const row1 = new ActionRowBuilder();
        
        if (!mainChar) {
          row1.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_add_main_${userId}`)
              .setLabel('Add Main Character')
              .setStyle(ButtonStyle.Success)
              .setEmoji('⭐')
          );
        } else {
          row1.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_update_main_${userId}`)
              .setLabel('Edit Main Character')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('✏️'),
            new ButtonBuilder()
              .setCustomId(`edit_remove_main_${userId}`)
              .setLabel('Remove Main Character')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🗑️')
          );
        }
        
        rows.push(row1);

        if (mainChar) {
          const row2 = new ActionRowBuilder();
          
          row2.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_add_alt_${userId}`)
              .setLabel('Add Alt Character')
              .setStyle(ButtonStyle.Success)
              .setEmoji('➕')
          );

          if (alts.length > 0) {
            row2.addComponents(
              new ButtonBuilder()
                .setCustomId(`edit_remove_alt_${userId}`)
                .setLabel('Remove Alt Character')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖')
            );
          }
          
          rows.push(row2);
        }

        const row3 = new ActionRowBuilder();
        
        if (mainChar) {
          row3.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_view_chars_${userId}`)
              .setLabel('View All Characters')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👀')
          );
        }
        
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_close_${userId}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
        );
        
        rows.push(row3);

        // Edit the message directly
        await message.edit({ embeds: [menuEmbed], components: rows });
      } catch (error) {
        console.error('Error returning to menu after removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveMain:', error);
    stateManager.clearRemovalState(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing your character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveMain(interaction) {
  const userId = interaction.user.id;
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('Your main character was not removed.')
    .setFooter({ text: '💡 Returning to menu...' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
  
  // Return to main menu - edit the message directly
  setTimeout(async () => {
    try {
      const message = await interaction.fetchReply();
      
      const mainChar = await queries.getMainCharacter(userId);
      const alts = mainChar ? await queries.getAltCharacters(userId) : [];

      const menuEmbed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('📋 Member Details Management')
        .setDescription('Choose what you\'d like to do:')
        .setFooter({ text: '💡 Select an action below' })
        .setTimestamp();

      if (mainChar) {
        menuEmbed.addFields(
          { 
            name: '⭐ Main Character', 
            value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}`, 
            inline: true 
          }
        );
        
        if (alts.length > 0) {
          menuEmbed.addFields({
            name: '📋 Alt Characters',
            value: alts.map(alt => `• ${alt.ign} (${alt.class})`).join('\n'),
            inline: true
          });
        }
      } else {
        menuEmbed.addFields({
          name: '📝 Status',
          value: 'No main character registered',
          inline: false
        });
      }

      const rows = [];
      const row1 = new ActionRowBuilder();
      
      if (!mainChar) {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_add_main_${userId}`)
            .setLabel('Add Main Character')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⭐')
        );
      } else {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_update_main_${userId}`)
            .setLabel('Edit Main Character')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
          new ButtonBuilder()
            .setCustomId(`edit_remove_main_${userId}`)
            .setLabel('Remove Main Character')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );
      }
      
      rows.push(row1);

      if (mainChar) {
        const row2 = new ActionRowBuilder();
        
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_add_alt_${userId}`)
            .setLabel('Add Alt Character')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕')
        );

        if (alts.length > 0) {
          row2.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_remove_alt_${userId}`)
              .setLabel('Remove Alt Character')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('➖')
          );
        }
        
        rows.push(row2);
      }

      const row3 = new ActionRowBuilder();
      
      if (mainChar) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_view_chars_${userId}`)
            .setLabel('View All Characters')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👀')
        );
      }
      
      row3.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_close_${userId}`)
          .setLabel('Close')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );
      
      rows.push(row3);

      await message.edit({ embeds: [menuEmbed], components: rows });
    } catch (error) {
      console.error('Error returning to menu after cancel:', error);
    }
  }, 1500);
}

export async function handleRemoveAlt(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Get alt characters
    const alts = await queries.getAltCharacters(userId);
    
    if (alts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alt Characters')
        .setDescription('You don\'t have any alt characters to remove!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show alt selection menu
    await showAltSelectionForRemoval(interaction, userId, alts);
    
  } catch (error) {
    console.error('Error in handleRemoveAlt:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showAltSelectionForRemoval(interaction, userId, alts) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_remove_${userId}`)
    .setPlaceholder('🗑️ Select alt character to remove')
    .addOptions(
      alts.map((alt, index) => ({
        label: alt.ign,
        value: alt.ign,
        description: `${alt.class} (${alt.subclass}) - ${alt.role}`,
        emoji: getClassEmoji(alt.class)
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('🗑️ Remove Alt Character')
    .setDescription('Select which alt character you want to remove')
    .addFields({
      name: '📋 Your Alt Characters',
      value: alts.map((alt, i) => `${i + 1}. ${alt.ign} - ${alt.class} (${alt.subclass})`).join('\n'),
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { alts, type: 'alt' });
}

export async function handleAltSelectionForRemoval(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedIGN = interaction.values[0];
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alts) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const selectedAlt = state.alts.find(alt => alt.ign === selectedIGN);
    
    if (!selectedAlt) {
      return interaction.reply({
        content: '❌ Alt character not found.',
        ephemeral: true
      });
    }

    // Show confirmation
    await showRemoveAltConfirmation(interaction, userId, selectedAlt);
    
  } catch (error) {
    console.error('Error in handleAltSelectionForRemoval:', error);
    stateManager.clearRemovalState(interaction.user.id);
  }
}

async function showRemoveAltConfirmation(interaction, userId, alt) {
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_alt_${userId}`)
    .setLabel('Yes, Remove This Alt')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('✅');

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_alt_${userId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Confirm Alt Removal')
    .setDescription('Are you sure you want to remove this alt character?')
    .addFields(
      { name: '🎮 IGN', value: alt.ign, inline: true },
      { name: '🎭 Class', value: `${alt.class} (${alt.subclass})`, inline: true },
      { name: '⚔️ Role', value: alt.role, inline: true }
    )
    .setFooter({ text: '⚠️ This action cannot be undone!' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { alt, type: 'alt' });
}

export async function handleConfirmRemoveAlt(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alt) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    // Delete the alt character
    await queries.deleteAltCharacter(userId, state.alt.ign);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alt Character Removed')
      .setDescription('Your alt character has been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.alt.ign,
        inline: false
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // Return to main menu - edit the message directly
    setTimeout(async () => {
      try {
        const message = await interaction.fetchReply();
        
        const mainChar = await queries.getMainCharacter(userId);
        const alts = mainChar ? await queries.getAltCharacters(userId) : [];

        const menuEmbed = new EmbedBuilder()
          .setColor('#6640D9')
          .setTitle('📋 Member Details Management')
          .setDescription('Choose what you\'d like to do:')
          .setFooter({ text: '💡 Select an action below' })
          .setTimestamp();

        if (mainChar) {
          menuEmbed.addFields(
            { 
              name: '⭐ Main Character', 
              value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}`, 
              inline: true 
            }
          );
          
          if (alts.length > 0) {
            menuEmbed.addFields({
              name: '📋 Alt Characters',
              value: alts.map(alt => `• ${alt.ign} (${alt.class})`).join('\n'),
              inline: true
            });
          }
        } else {
          menuEmbed.addFields({
            name: '📝 Status',
            value: 'No main character registered',
            inline: false
          });
        }

        const rows = [];
        const row1 = new ActionRowBuilder();
        
        if (!mainChar) {
          row1.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_add_main_${userId}`)
              .setLabel('Add Main Character')
              .setStyle(ButtonStyle.Success)
              .setEmoji('⭐')
          );
        } else {
          row1.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_update_main_${userId}`)
              .setLabel('Edit Main Character')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('✏️'),
            new ButtonBuilder()
              .setCustomId(`edit_remove_main_${userId}`)
              .setLabel('Remove Main Character')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🗑️')
          );
        }
        
        rows.push(row1);

        if (mainChar) {
          const row2 = new ActionRowBuilder();
          
          row2.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_add_alt_${userId}`)
              .setLabel('Add Alt Character')
              .setStyle(ButtonStyle.Success)
              .setEmoji('➕')
          );

          if (alts.length > 0) {
            row2.addComponents(
              new ButtonBuilder()
                .setCustomId(`edit_remove_alt_${userId}`)
                .setLabel('Remove Alt Character')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖')
            );
          }
          
          rows.push(row2);
        }

        const row3 = new ActionRowBuilder();
        
        if (mainChar) {
          row3.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_view_chars_${userId}`)
              .setLabel('View All Characters')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👀')
          );
        }
        
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_close_${userId}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
        );
        
        rows.push(row3);

        await message.edit({ embeds: [menuEmbed], components: rows });
      } catch (error) {
        console.error('Error returning to menu after alt removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveAlt:', error);
    stateManager.clearRemovalState(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing your alt character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveAlt(interaction) {
  const userId = interaction.user.id;
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('Your alt character was not removed.')
    .setFooter({ text: '💡 Returning to menu...' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
  
  // Return to main menu - edit the message directly
  setTimeout(async () => {
    try {
      const message = await interaction.fetchReply();
      
      const mainChar = await queries.getMainCharacter(userId);
      const alts = mainChar ? await queries.getAltCharacters(userId) : [];

      const menuEmbed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('📋 Member Details Management')
        .setDescription('Choose what you\'d like to do:')
        .setFooter({ text: '💡 Select an action below' })
        .setTimestamp();

      if (mainChar) {
        menuEmbed.addFields(
          { 
            name: '⭐ Main Character', 
            value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}`, 
            inline: true 
          }
        );
        
        if (alts.length > 0) {
          menuEmbed.addFields({
            name: '📋 Alt Characters',
            value: alts.map(alt => `• ${alt.ign} (${alt.class})`).join('\n'),
            inline: true
          });
        }
      } else {
        menuEmbed.addFields({
          name: '📝 Status',
          value: 'No main character registered',
          inline: false
        });
      }

      const rows = [];
      const row1 = new ActionRowBuilder();
      
      if (!mainChar) {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_add_main_${userId}`)
            .setLabel('Add Main Character')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⭐')
        );
      } else {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_update_main_${userId}`)
            .setLabel('Edit Main Character')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
          new ButtonBuilder()
            .setCustomId(`edit_remove_main_${userId}`)
            .setLabel('Remove Main Character')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );
      }
      
      rows.push(row1);

      if (mainChar) {
        const row2 = new ActionRowBuilder();
        
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_add_alt_${userId}`)
            .setLabel('Add Alt Character')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕')
        );

        if (alts.length > 0) {
          row2.addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_remove_alt_${userId}`)
              .setLabel('Remove Alt Character')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('➖')
          );
        }
        
        rows.push(row2);
      }

      const row3 = new ActionRowBuilder();
      
      if (mainChar) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_view_chars_${userId}`)
            .setLabel('View All Characters')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👀')
        );
      }
      
      row3.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_close_${userId}`)
          .setLabel('Close')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );
      
      rows.push(row3);

      await message.edit({ embeds: [menuEmbed], components: rows });
    } catch (error) {
      console.error('Error returning to menu after cancel:', error);
    }
  }, 1500);
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
