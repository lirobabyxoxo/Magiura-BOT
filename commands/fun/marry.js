const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { formatMarriageTime } = require('../../utils/timeUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Casar com alguém ou verificar status do casamento')
    .addUserOption(option =>
      option.setName('pessoa')
        .setDescription('Pessoa para casar (deixe vazio para ver seu status)')
        .setRequired(false)
    ),

  async execute(interaction, db) {
    const targetUser = interaction.options.getUser('pessoa');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Check current marriage status
    const currentMarriage = db.get(`marriage_${guildId}_${userId}`);

    if (!targetUser) {
      // Show marriage status
      if (!currentMarriage) {
        const embed = createEmbed(
          'Status de Casamento',
          'Você não está casado(a). Use `/marry @pessoa` para fazer um pedido!'
        );
        return interaction.reply({ embeds: [embed] });
      }

      // Show current marriage with divorce option
      const partner = await interaction.client.users.fetch(currentMarriage.partner);
      const marriageTime = formatMarriageTime(currentMarriage.date);

      const divorceButton = new MessageButton()
        .setCustomId(`divorce_${guildId}_${userId}`)
        .setLabel('Divorciar')
        .setStyle('DANGER');

      const row = new MessageActionRow().addComponents(divorceButton);

      const embed = createEmbed(
        'Status de Casamento',
        `Você está casado(a) com ${partner}\n\n**Tempo de relacionamento:** ${marriageTime}`,
        {
          thumbnail: partner.displayAvatarURL({ dynamic: true })
        }
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (targetUser.id === userId) {
      const embed = createEmbed('Erro', 'Você não pode casar consigo mesmo!');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (currentMarriage) {
      const partner = await interaction.client.users.fetch(currentMarriage.partner);
      const embed = createEmbed(
        'Erro',
        `Você já está casado(a) com ${partner}! Use o comando sem mencionar ninguém para ver detalhes.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if target is already married
    const targetMarriage = db.get(`marriage_${guildId}_${targetUser.id}`);
    if (targetMarriage) {
      const embed = createEmbed(
        'Erro',
        `${targetUser} já está casado(a) com outra pessoa!`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Send marriage proposal
    const acceptButton = new MessageButton()
      .setCustomId(`marry_accept_${userId}_${targetUser.id}`)
      .setLabel('Aceitar')
      .setStyle('SUCCESS');

    const rejectButton = new MessageButton()
      .setCustomId(`marry_reject_${userId}_${targetUser.id}`)
      .setLabel('Recusar')
      .setStyle('DANGER');

    const row = new MessageActionRow().addComponents(acceptButton, rejectButton);

    const embed = createEmbed(
      'Pedido de Casamento',
      `${interaction.user} está pedindo ${targetUser} em casamento!\n\n${targetUser}, você aceita?`
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};