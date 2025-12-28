import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatScore } from './utils.js';

export function createApplicationEmbed(user, character, application) {
  const acceptVotes = application.accept_votes || [];
  const denyVotes = application.deny_votes || [];
  
  const acceptList = acceptVotes.length > 0 
    ? acceptVotes.map(id => `<@${id}>`).join(', ')
    : '*None yet*';
  
  const denyList = denyVotes.length > 0 
    ? denyVotes.map(id => `<@${id}>`).join(', ')
    : '*None yet*';

  return new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🏰 Guild Application - iDolls')
    .setDescription(`**${user.username}** has applied to join **iDolls**!`)
    .addFields(
      { name: '👤 Discord User', value: `<@${user.id}>`, inline: true },
      { name: '🎮 IGN', value: character.ign, inline: true },
      { name: '🆔 UID', value: character.uid || 'Not set', inline: true },
      { name: '🎭 Class', value: `${character.class}\n${character.subclass}`, inline: true },
      { name: '💪 Score', value: formatScore(character.ability_score), inline: true },
      { name: '🏰 Applied Guild', value: application.guild_name, inline: true },
      { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
      { name: `✅ Accept (${acceptVotes.length}/2)`, value: acceptList, inline: true },
      { name: `❌ Deny (${denyVotes.length}/2)`, value: denyList, inline: true }
    )
    .setFooter({ text: `Application ID: ${application.id} | 2 votes needed to approve/deny` })
    .setTimestamp(new Date(application.created_at));
}

export function createApplicationButtons(applicationId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`app_vote_accept_${applicationId}`)
        .setLabel('Vote Accept')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`app_vote_deny_${applicationId}`)
        .setLabel('Vote Deny')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`app_override_${applicationId}`)
        .setLabel('Admin Override')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function createOverrideButtons(applicationId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`app_override_accept_${applicationId}`)
        .setLabel('Override: Accept')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`app_override_deny_${applicationId}`)
        .setLabel('Override: Deny')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`app_override_cancel_${applicationId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}
