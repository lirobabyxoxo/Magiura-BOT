const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Informações detalhadas do servidor'),

  async execute(interaction, db) {
    const guild = interaction.guild;
    
    // Calculate bot's time in server
    const botMember = guild.members.cache.get(interaction.client.user.id);
    const botJoinDate = botMember ? botMember.joinedAt : null;
    let botTimeInServer = "Não disponível";
    
    if (botJoinDate) {
      const timeDiff = Date.now() - botJoinDate.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      botTimeInServer = `${days} dias e ${hours} horas`;
    }

    const embed = createEmbed(
      `Informações de ${guild.name}`,
      null,
      {
        thumbnail: guild.iconURL({ dynamic: true }),
        fields: [
          {
            name: 'Informações Gerais',
            value: `**Nome:** ${guild.name}\n**ID:** ${guild.id}\n**Criado em:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
            inline: true
          },
          {
            name: 'Membros',
            value: `**Total:** ${guild.memberCount}\n**Online:** ${guild.members.cache.filter(m => m.presence?.status === 'online').size}\n**Bots:** ${guild.members.cache.filter(m => m.user.bot).size}`,
            inline: true
          },
          {
            name: 'Canais',
            value: `**Total:** ${guild.channels.cache.size}\n**Texto:** ${guild.channels.cache.filter(c => c.type === 'GUILD_TEXT').size}\n**Voz:** ${guild.channels.cache.filter(c => c.type === 'GUILD_VOICE').size}`,
            inline: true
          },
          {
            name: 'Boosts',
            value: `**Nível:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
            inline: true
          },
          {
            name: 'Dono',
            value: `<@${guild.ownerId}>`,
            inline: true
          },
          {
            name: 'Bot no Servidor',
            value: botTimeInServer,
            inline: true
          }
        ]
      }
    );

    await interaction.reply({ embeds: [embed] });
  }
};