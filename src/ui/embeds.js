import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';
import { formatScore, formatTime, getRoleEmoji, getClassEmoji } from './utils.js';
import { TimezoneRepo, BattleImagineRepo, ApplicationRepo } from '../database/repositories.js';

export const embed = (title, description) => {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(`# **${title}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`)
    .setTimestamp();
};

export const errorEmbed = (message) => {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setDescription(`# ❌ **Error**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${message}`)
    .setTimestamp();
};

export const successEmbed = (message) => {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setDescription(`# ✅ **Success**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${message}`)
    .setTimestamp();
};

export async function profileEmbed(user, characters, interaction = null) {
  const main = characters.find(c => c.characterType === 'main');
  const subs = characters.filter(c => c.characterType === 'main_subclass');

  let displayName = user.username;
  if (interaction?.guild) {
    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (member.nickname) displayName = member.nickname;
    } catch (e) {}
  }

  const tz = await TimezoneRepo.get(user.id);
  const timeText = tz ? `\n🌍 ${formatTime(tz)}` : '';

  if (!main) {
    const centerText = (text, width = 37) => text.padStart((text.length + width) / 2).padEnd(width);
    
    const welcomeLine = `Welcome ${displayName}`;
    const noCharLine = 'No character yet? No worries~';
    const tapLine = 'Tap the button below';
    const setupLine = 'We\'ll set you up in no time!';
    
    const welcomeText = [
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
      '',
      '\u001b[1;35m' + centerText('≽^•⩊•^≼') + '\u001b[0m',
      '',
      '\u001b[1;34m' + centerText(welcomeLine) + '\u001b[0m',
      '',
      '\u001b[1;37m' + centerText(noCharLine) + '\u001b[0m',
      '\u001b[1;37m' + centerText(tapLine) + '\u001b[0m',
      '\u001b[1;37m' + centerText(setupLine) + '\u001b[0m',
      '',
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
    ].join('\n');

    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription('## **iDolls 💫**\n```ansi\n' + welcomeText + '\n```')
      .setTimestamp();
  }

  const roleEmoji = getRoleEmoji(main.role);
  const classEmoji = getClassEmoji(interaction?.guild, main.className);

  let guildDisplay = main.guild || 'None';
  if (main.guild === 'iDolls') {
    try {
      const pendingApp = await ApplicationRepo.findAllByUserAndCharacter(user.id, main.id);
      if (pendingApp && pendingApp.status === 'pending') {
        guildDisplay = '⏳ Pending - iDolls';
      } else {
        guildDisplay = 'iDolls';
      }
    } catch (error) {
      console.error('[EMBED] Error checking pending application:', error);
      guildDisplay = 'iDolls';
    }
  }

  let mainSection = '```ansi\n';
  mainSection += '\u001b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
  mainSection += '\u001b[1;34m🎮 IGN:\u001b[0m \u001b[1;37m' + main.ign + '\u001b[0m\n';
  mainSection += '\u001b[1;34m🆔 UID:\u001b[0m \u001b[1;37m' + main.uid + '\u001b[0m\n';
  mainSection += '\u001b[1;34m🎭 Class:\u001b[0m \u001b[1;37m' + main.className + ' - ' + main.subclass + '\u001b[0m\n';
  mainSection += '\u001b[1;34m💪 Score:\u001b[0m \u001b[1;37m' + formatScore(main.abilityScore) + '\u001b[0m\n';

  const mainBI = await BattleImagineRepo.findByCharacter(main.id);
  if (mainBI.length > 0) {
    mainSection += '\u001b[1;34m⚔️ Battle Imagines:\u001b[0m \u001b[1;37m' + mainBI.map(b => b.imagineName + ' ' + b.tier).join(', ') + '\u001b[0m\n';
  }

  mainSection += '\u001b[1;34m🏰 Guild:\u001b[0m \u001b[1;35m' + guildDisplay + '\u001b[0m\n';
  mainSection += '\u001b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
  mainSection += '```';

  const e = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription('# **iDolls - ' + displayName + '\'s Profile** ' + classEmoji + timeText + '\n' + mainSection)
    .setTimestamp();

  if (subs.length > 0) {
    let subSection = '```ansi\n';
    subs.forEach((sub, i) => {
      subSection += '\u001b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
      subSection += '\u001b[1;34m🎭 Class:\u001b[0m \u001b[1;37m' + sub.className + ' - ' + sub.subclass + '\u001b[0m\n';
      subSection += '\u001b[1;34m💪 Score:\u001b[0m \u001b[1;37m' + formatScore(sub.abilityScore) + '\u001b[0m\n';
    });
    subSection += '\u001b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
    subSection += '```';
    e.addFields({ name: '📊 Subclass' + (subs.length > 1 ? 'es' : '') + ' (' + subs.length + ')', value: subSection, inline: false });
  }

  return e;
}
