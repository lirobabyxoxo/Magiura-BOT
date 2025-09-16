const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Painel de administração para configurar embeds')
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('Tipo de embed para configurar')
        .setRequired(false)
        .addChoices(
          { name: 'Mute', value: 'mute' },
          { name: 'Ban', value: 'ban' },
          { name: 'Kick', value: 'kick' }
        )
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      const embed = createErrorEmbed('Você não tem permissão para usar este comando.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const tipo = interaction.options.getString('tipo');

    if (!tipo) {
      // Show main panel
      const muteButton = new MessageButton()
        .setCustomId(`painel_mute_${interaction.guild.id}`)
        .setLabel('Configurar Mute')
        .setStyle('PRIMARY');

      const banButton = new MessageButton()
        .setCustomId(`painel_ban_${interaction.guild.id}`)
        .setLabel('Configurar Ban')
        .setStyle('DANGER');

      const kickButton = new MessageButton()
        .setCustomId(`painel_kick_${interaction.guild.id}`)
        .setLabel('Configurar Kick')
        .setStyle('SECONDARY');

      const row = new MessageActionRow().addComponents(muteButton, banButton, kickButton);

      const embed = createEmbed(
        'Painel de Administração',
        'Selecione qual tipo de embed você deseja configurar:'
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Show specific configuration
    const config = db.get(`embed_config_${tipo}_${interaction.guild.id}`) || {};

    const embed = createEmbed(
      `Configuração de Embed - ${tipo.toUpperCase()}`,
      `**Cor atual:** ${config.color || '#000000'}\n**GIF/Imagem:** ${config.gif || 'Nenhuma'}\n**Descrição personalizada:** ${config.description || 'Padrão'}`,
      {
        fields: [
          {
            name: 'Comandos de Configuração',
            value: `\`/painel-config ${tipo} cor #hexcolor\` - Alterar cor\n\`/painel-config ${tipo} gif url\` - Definir GIF/imagem\n\`/painel-config ${tipo} descricao texto\` - Personalizar descrição`,
            inline: false
          }
        ]
      }
    );

    await interaction.reply({ embeds: [embed] });
  }
};