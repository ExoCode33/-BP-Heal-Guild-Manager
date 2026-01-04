import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';

export async function profileEmbed(user, characters, interaction) {
  const main = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subclasses = characters.filter(c => c.character_type === 'main_subclass');

  if (!main) {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setDescription(
        '# 📋 **Character Profile**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**No main character registered.**\n\n' +
        'Use the **Register** button to create your main character.'
      )
      .setTimestamp();
  }

  let description = '# 📋 **Character Profile**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Main Character Section
  description += '## 🎮 **Main Character**\n';
  description += `**IGN:** ${main.ign}\n`;
  description += `**UID:** ${main.uid}\n`;
  description += `**Class:** ${main.class} - ${main.subclass}\n`;
  description += `**Score:** ${main.ability_score}\n`;
  description += `**Guild:** ${main.guild}\n`;

  // Battle Imagines for Main
  const { BattleImagineRepo } = await import('../database/repositories.js');
  const mainBIs = await BattleImagineRepo.findByCharacter(main.id);
  if (mainBIs.length > 0) {
    description += `**Battle Imagines:** ${mainBIs.map(bi => `${bi.name} (${bi.tier})`).join(', ')}\n`;
  }

  // Subclasses
  if (subclasses.length > 0) {
    description += '\n## ✨ **Subclasses**\n';
    for (const sub of subclasses) {
      description += `• ${sub.class} - ${sub.subclass} (${sub.ability_score})\n`;
    }
  }

  // Alt Characters
  if (alts.length > 0) {
    description += '\n## 🎭 **Alt Characters**\n';
    for (const alt of alts) {
      description += `\n**${alt.ign}**\n`;
      description += `• UID: ${alt.uid}\n`;
      description += `• Class: ${alt.class} - ${alt.subclass}\n`;
      description += `• Score: ${alt.ability_score}\n`;
      description += `• Guild: ${alt.guild}\n`;

      const altBIs = await BattleImagineRepo.findByCharacter(alt.id);
      if (altBIs.length > 0) {
        description += `• Battle Imagines: ${altBIs.map(bi => `${bi.name} (${bi.tier})`).join(', ')}\n`;
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(description)
    .setTimestamp();

  return embed;
}

export default { profileEmbed };
