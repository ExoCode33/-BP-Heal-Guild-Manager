import * as registration from './registration.js';
import * as editing from './editing.js';
import * as deletion from './deletion.js';
import applicationService from '../services/applications.js';
import { MessageFlags } from 'discord.js';

// ═══════════════════════════════════════════════════════════════════
// BUTTON INTERACTION ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function route(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Button interaction:', customId);

  try {
    // ═══════════════════════════════════════════════════════════════
    // APPLICATION HANDLERS - Handle FIRST, before ownership checks
    // ═══════════════════════════════════════════════════════════════
    
    if (customId.startsWith('app_vote_accept_')) {
      const appId = parseInt(customId.split('_')[3]);
      console.log(`[ROUTER] Accept vote button clicked, appId: ${appId}`);
      await applicationService.handleVote(interaction, appId, 'accept');
      return;
    }
    
    if (customId.startsWith('app_vote_deny_')) {
      const appId = parseInt(customId.split('_')[3]);
      console.log(`[ROUTER] Deny vote button clicked, appId: ${appId}`);
      await applicationService.handleVote(interaction, appId, 'deny');
      return;
    }
    
    if (customId.startsWith('app_override_') && !customId.includes('accept') && !customId.includes('deny') && !customId.includes('cancel')) {
      const appId = parseInt(customId.split('_')[2]);
      console.log(`[ROUTER] Override menu button clicked, appId: ${appId}`);
      await applicationService.showOverrideMenu(interaction, appId);
      return;
    }
    
    if (customId.startsWith('app_override_accept_')) {
      const appId = parseInt(customId.split('_')[3]);
      console.log(`[ROUTER] Override accept button clicked, appId: ${appId}`);
      await applicationService.handleOverride(interaction, appId, 'accept');
      return;
    }
    
    if (customId.startsWith('app_override_deny_')) {
      const appId = parseInt(customId.split('_')[3]);
      console.log(`[ROUTER] Override deny button clicked, appId: ${appId}`);
      await applicationService.handleOverride(interaction, appId, 'deny');
      return;
    }
    
    if (customId.startsWith('app_override_cancel_')) {
      const appId = parseInt(customId.split('_')[3]);
      console.log(`[ROUTER] Override cancel button clicked, appId: ${appId}`);
      await applicationService.cancelOverride(interaction, appId);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // VERIFICATION & REGISTRATION
    // ═══════════════════════════════════════════════════════════════
    
    // Verification Register Button (welcome channel)
    if (customId === 'verification_register') {
      await registration.start(interaction, userId);
    }
    // ✅ IMPROVED: Verification Non-Player Button (I'm just here to vibe)
    else if (customId === 'verification_non_player') {
      const config = await import('../config/index.js').then(m => m.default);
      const { CharacterRepo } = await import('../database/repositories.js');
      
      // Check if user already has a main character
      const existingMain = await CharacterRepo.findMain(userId);
      if (existingMain) {
        await interaction.reply({
          content: '💖 **Hehe, caught you!** ≽^•⩊•^≼\n\nLooks like you\'re already playing! This button is only for our non-player friends who just wanna hang out~\n\nUse `/character` to see your adorable profile instead! 🎮✨',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      
      const guild = await interaction.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(userId);
      
      // Check if they already have the Visitor role
      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await interaction.reply({
          content: '🌸 **You\'re already vibing with us!** (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n\nNo need to click again, silly~ You\'ve got the Visitor role! Now go have fun! 💕',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      
      // Add BOTH Visitor and Verified roles
      const rolesAdded = [];
      
      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
        rolesAdded.push('Visitor');
        console.log(`✅ [VERIFICATION] Added Visitor role to ${member.user.username}`);
      }
      
      if (config.roles.verified) {
        await member.roles.add(config.roles.verified);
        rolesAdded.push('Verified');
        console.log(`✅ [VERIFICATION] Added Verified role to ${member.user.username}`);
      }
      
      await interaction.reply({
        content: `✅ **Welcome!** You now have the ${rolesAdded.join(' and ')} role${rolesAdded.length > 1 ? 's' : ''}. Enjoy chatting with us! 💕`,
        flags: MessageFlags.Ephemeral
      });
    }
    // Registration - Main Character
    else if (customId.startsWith('register_')) {
      const targetUserId = customId.replace('register_', '');
      await registration.start(interaction, targetUserId);
    }
    else if (customId.startsWith('confirm_replace_main_')) {
      const targetUserId = customId.replace('confirm_replace_main_', '');
      await registration.confirmReplaceMain(interaction, targetUserId);
    }
    else if (customId.startsWith('cancel_replace_main_')) {
      const targetUserId = customId.replace('cancel_replace_main_', '');
      await registration.cancelReplaceMain(interaction, targetUserId);
    }
    else if (customId.startsWith('retry_ign_uid_')) {
      const targetUserId = customId.replace('retry_ign_uid_', '');
      await registration.retryIGN(interaction, targetUserId);
    }

    // Registration - Subclass
    else if (customId.startsWith('add_subclass_')) {
      const parentId = parseInt(customId.split('_')[2]);
      await registration.startSubclassRegistration(interaction, userId, parentId);
    }

    // Registration - Alt
    else if (customId.startsWith('add_alt_')) {
      const targetUserId = customId.replace('add_alt_', '');
      await registration.startAltRegistration(interaction, targetUserId);
    }

    // ✅ Add Character Button
    else if (customId.startsWith('add_character_')) {
      // Extract target user ID from button (supports admin adding for other users)
      const targetUserId = customId.replace('add_character_', '');
      const { showAddCharacterMenu } = await import('./adding.js');
      await showAddCharacterMenu(interaction, targetUserId);
    }

    // Registration - Back Buttons
    else if (customId.startsWith('back_to_region_')) {
      const targetUserId = customId.replace('back_to_region_', '');
      await registration.backToRegion(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_country_')) {
      const targetUserId = customId.replace('back_to_country_', '');
      await registration.backToCountry(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_timezone_')) {
      const targetUserId = customId.replace('back_to_timezone_', '');
      await registration.backToTimezone(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_class_')) {
      const targetUserId = customId.replace('back_to_class_', '');
      await registration.backToClass(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_subclass_')) {
      const targetUserId = customId.replace('back_to_subclass_', '');
      await registration.backToSubclass(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_score_')) {
      const targetUserId = customId.replace('back_to_score_', '');
      await registration.backToScore(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_battle_imagine_')) {
      const targetUserId = customId.replace('back_to_battle_imagine_', '');
      await registration.backToBattleImagine(interaction, targetUserId);
    }

    // Editing
    else if (customId.startsWith('edit_character_')) {
      // Extract target user ID from button (supports admin editing other users)
      const targetUserId = customId.replace('edit_character_', '');
      await editing.start(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_edit_select_')) {
      const targetUserId = customId.replace('back_to_edit_select_', '');
      await editing.backToEditSelect(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_edit_field_')) {
      const targetUserId = customId.replace('back_to_edit_field_', '');
      await editing.backToEditField(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_edit_class_')) {
      const targetUserId = customId.replace('back_to_edit_class_', '');
      await editing.backToEditClass(interaction, targetUserId);
    }
    else if (customId.startsWith('back_to_edit_bi_list_')) {
      const targetUserId = customId.replace('back_to_edit_bi_list_', '');
      await editing.backToBIList(interaction, targetUserId);
    }
    else if (customId.startsWith('retry_edit_uid_')) {
      const targetUserId = customId.replace('retry_edit_uid_', '');
      await editing.retryUIDEdit(interaction, targetUserId);
    }

    // 🆕 Discord Nickname (Main Button)
    else if (customId.startsWith('discord_nickname_')) {
      // Extract target user ID from button
      const targetUserId = customId.replace('discord_nickname_', '');
      await editing.showNicknameSelection(interaction, targetUserId);
    }

    // Deletion/Removal
    else if (customId.startsWith('remove_character_')) {
      // Extract target user ID from button (supports admin removing for other users)
      const targetUserId = customId.replace('remove_character_', '');
      await deletion.start(interaction, targetUserId);
    }
    else if (customId.startsWith('confirm_remove_main_')) {
      const targetUserId = customId.replace('confirm_remove_main_', '');
      await deletion.executeRemoveMain(interaction, targetUserId);
    }
    else if (customId.startsWith('confirm_remove_subclass_')) {
      const parts = customId.split('_');
      const subclassId = parseInt(parts[parts.length - 1]);
      const targetUserId = parts.slice(3, -1).join('_'); // Extract userId between 'confirm_remove_subclass_' and subclassId
      await deletion.executeRemoveSubclass(interaction, targetUserId, subclassId);
    }
    else if (customId.startsWith('confirm_remove_alt_')) {
      const parts = customId.split('_');
      const altId = parseInt(parts[parts.length - 1]);
      const targetUserId = parts.slice(3, -1).join('_'); // Extract userId between 'confirm_remove_alt_' and altId
      await deletion.executeRemoveAlt(interaction, targetUserId, altId);
    }
    else if (customId.startsWith('confirm_remove_all_')) {
      const targetUserId = customId.replace('confirm_remove_all_', '');
      await deletion.executeRemoveAll(interaction, targetUserId);
    }
    else if (customId.startsWith('cancel_remove_')) {
      const targetUserId = customId.replace('cancel_remove_', '');
      await deletion.cancelRemove(interaction, targetUserId);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN SETTINGS
    // ═══════════════════════════════════════════════════════════════
    
    // Admin Settings - Back Button
    else if (customId.startsWith('admin_settings_back_')) {
      const targetUserId = customId.replace('admin_settings_back_', '');
      const { handleSettingsBackButton } = await import('../services/adminSettings.js');
      await handleSettingsBackButton(interaction);
    }

    // Profile / Back to Profile
    else if (customId.startsWith('back_to_profile_')) {
      const targetUserId = customId.replace('back_to_profile_', '');
      const { profileEmbed } = await import('../ui/embeds.js');
      const { profileButtons, adminProfileButtons } = await import('../ui/components.js');
      const { CharacterRepo } = await import('../database/repositories.js');

      const characters = await CharacterRepo.findAllByUser(targetUserId);
      const main = characters.find(c => c.character_type === 'main');

      // Get the target user for the embed
      const targetUser = await interaction.client.users.fetch(targetUserId);
      const embed = await profileEmbed(targetUser, characters, interaction);
      
      // Use admin buttons if viewing someone else's profile, otherwise use regular buttons
      const buttons = targetUserId === interaction.user.id 
        ? profileButtons(targetUserId, !!main)
        : adminProfileButtons(targetUserId, !!main);

      await interaction.update({ embeds: [embed], components: buttons });
    }

    else {
      console.log('[ROUTER] Unknown button interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown interaction. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error handling button:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SELECT MENU ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Select menu interaction:', customId);

  try {
    // Registration - Region, Country, Timezone
    if (customId.startsWith('select_region_')) {
      const targetUserId = customId.replace('select_region_', '');
      await registration.handleRegion(interaction, targetUserId);
    }
    else if (customId.startsWith('select_country_')) {
      const targetUserId = customId.replace('select_country_', '');
      await registration.handleCountry(interaction, targetUserId);
    }
    else if (customId.startsWith('select_timezone_')) {
      const targetUserId = customId.replace('select_timezone_', '');
      await registration.handleTimezone(interaction, targetUserId);
    }

    // Registration - Class, Subclass, Score
    else if (customId.startsWith('select_class_')) {
      const targetUserId = customId.replace('select_class_', '');
      await registration.handleClass(interaction, targetUserId);
    }
    else if (customId.startsWith('select_subclass_')) {
      const targetUserId = customId.replace('select_subclass_', '');
      await registration.handleSubclass(interaction, targetUserId);
    }
    else if (customId.startsWith('select_ability_score_')) {
      const targetUserId = customId.replace('select_ability_score_', '');
      await registration.handleScore(interaction, targetUserId);
    }

    // Registration - Battle Imagines
    else if (customId.startsWith('select_battle_imagine_')) {
      const targetUserId = customId.replace('select_battle_imagine_', '');
      await registration.handleBattleImagine(interaction, targetUserId);
    }

    // Registration - Guild
    else if (customId.startsWith('select_guild_')) {
      const targetUserId = customId.replace('select_guild_', '');
      await registration.handleGuild(interaction, targetUserId);
    }

    // ✅ FIXED: Add Character Type Selection
    else if (customId.startsWith('select_add_character_type_')) {
      const targetUserId = customId.replace('select_add_character_type_', '');
      const { handleAddCharacterType } = await import('./adding.js');
      await handleAddCharacterType(interaction, targetUserId);
    }

    // Editing - Character Selection
    else if (customId.startsWith('select_edit_character_')) {
      // Extract target user ID from select menu (supports admin editing other users)
      const targetUserId = customId.replace('select_edit_character_', '');
      await editing.selectCharacter(interaction, targetUserId);
    }
    else if (customId.startsWith('select_edit_field_')) {
      // Extract target user ID from select menu
      const targetUserId = customId.replace('select_edit_field_', '');
      await editing.selectField(interaction, targetUserId);
    }

    // Editing - Class/Subclass
    else if (customId.startsWith('edit_select_class_')) {
      const targetUserId = customId.replace('edit_select_class_', '');
      await editing.handleClassEdit(interaction, targetUserId);
    }
    else if (customId.startsWith('edit_select_subclass_')) {
      const targetUserId = customId.replace('edit_select_subclass_', '');
      await editing.handleSubclassEdit(interaction, targetUserId);
    }

    // Editing - Score
    else if (customId.startsWith('edit_select_score_')) {
      const targetUserId = customId.replace('edit_select_score_', '');
      await editing.handleScoreEdit(interaction, targetUserId);
    }

    // Editing - Guild
    else if (customId.startsWith('edit_select_guild_')) {
      const targetUserId = customId.replace('edit_select_guild_', '');
      await editing.handleGuildEdit(interaction, targetUserId);
    }

    // ✅ CRITICAL FIX: Battle Imagines - Check more specific pattern FIRST
    // This prevents "edit_select_bi_tier_123" from matching "edit_select_bi_" first
    else if (customId.startsWith('edit_select_bi_tier_')) {
      const targetUserId = customId.replace('edit_select_bi_tier_', '');
      await editing.handleBattleImagineTierEdit(interaction, targetUserId);
    }
    else if (customId.startsWith('edit_select_bi_')) {
      const targetUserId = customId.replace('edit_select_bi_', '');
      await editing.selectBattleImagine(interaction, targetUserId);
    }

    // ✅ FIXED ORDER: More specific pattern FIRST (style handler before general nickname handler)
    // Editing - Discord Nickname Style (MUST come before general nickname handler)
    else if (customId.startsWith('edit_select_nickname_style_')) {
      const targetUserId = customId.replace('edit_select_nickname_style_', '');
      console.log('[ROUTER] Calling handleNicknameStyleEdit for user:', targetUserId);
      await editing.handleNicknameStyleEdit(interaction, targetUserId);
      console.log('[ROUTER] handleNicknameStyleEdit completed');
    }
    // Editing - Discord Nickname (general handler, comes AFTER style)
    else if (customId.startsWith('edit_select_nickname_')) {
      const targetUserId = customId.replace('edit_select_nickname_', '');
      await editing.handleNicknameEdit(interaction, targetUserId);
    }

    // Deletion - Remove Type Selection
    else if (customId.startsWith('select_remove_type_')) {
      const targetUserId = customId.replace('select_remove_type_', '');
      await deletion.selectRemoveType(interaction, targetUserId);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN SETTINGS
    // ═══════════════════════════════════════════════════════════════
    
    // Admin Settings Main Menu
    else if (customId.startsWith('admin_settings_menu_')) {
      const targetUserId = customId.replace('admin_settings_menu_', '');
      const { handleSettingsMenuSelect } = await import('../services/adminSettings.js');
      await handleSettingsMenuSelect(interaction);
    }

    // Admin Logging Settings
    else if (customId.startsWith('admin_logs_channel_')) {
      const targetUserId = customId.replace('admin_logs_channel_', '');
      const { handleLogChannelSelect } = await import('../services/adminSettings.js');
      await handleLogChannelSelect(interaction);
    }
    else if (customId.startsWith('admin_logs_batch_')) {
      const targetUserId = customId.replace('admin_logs_batch_', '');
      const { handleLogBatchSelect } = await import('../services/adminSettings.js');
      await handleLogBatchSelect(interaction);
    }
    else if (customId.startsWith('admin_logs_categories_')) {
      const targetUserId = customId.replace('admin_logs_categories_', '');
      const { handleLogCategoriesSelect } = await import('../services/adminSettings.js');
      await handleLogCategoriesSelect(interaction);
    }

    // Admin Ephemeral Settings
    else if (customId.startsWith('admin_ephemeral_')) {
      const targetUserId = customId.replace('admin_ephemeral_', '');
      const { handleEphemeralSelect } = await import('../services/adminSettings.js');
      await handleEphemeralSelect(interaction);
    }

    // Admin Verification Settings
    else if (customId.startsWith('admin_verification_channel_')) {
      const targetUserId = customId.replace('admin_verification_channel_', '');
      const { handleVerificationChannelSelect } = await import('../services/adminSettings.js');
      await handleVerificationChannelSelect(interaction);
    }

    else {
      console.log('[ROUTER] Unknown select menu interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown interaction. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error handling select menu:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function routeModal(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Modal interaction:', customId);

  try {
    // Registration - IGN/UID Modal
    if (customId.startsWith('ign_modal_')) {
      const targetUserId = customId.replace('ign_modal_', '');
      await registration.handleIGN(interaction, targetUserId);
    }

    // Editing - IGN Modal (supports admin editing other users)
    else if (customId.startsWith('edit_ign_modal_')) {
      const targetUserId = customId.replace('edit_ign_modal_', '');
      await editing.handleIGNEdit(interaction, targetUserId);
    }

    // Editing - UID Modal (supports admin editing other users)
    else if (customId.startsWith('edit_uid_modal_')) {
      const targetUserId = customId.replace('edit_uid_modal_', '');
      await editing.handleUIDEdit(interaction, targetUserId);
    }

    else {
      console.log('[ROUTER] Unknown modal interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown interaction. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error handling modal:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error message:', replyError);
    }
  }
}

export default {
  route,
  routeSelectMenu,
  routeModal
};
