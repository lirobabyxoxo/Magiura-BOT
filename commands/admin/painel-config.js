const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-config')
    .setDescription('Configurar embeds do painel')
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('Tipo de embed')
        .setRequired(true)
        .addChoices(
          { name: 'Mute', value: 'mute' },
          { name: 'Ban', value: 'ban' },
          { name: 'Kick', value: 'kick' }
        )
    )
    .addStringOption(option =>
      option.setName('campo')
        .setDescription('Campo a configurar')
        .setRequired(true)
        .addChoices(
          { name: 'Cor', value: 'cor' },
          { name: 'GIF/Imagem', value: 'gif' },
          { name: 'Descrição', value: 'descricao' }
        )
    )
    .addStringOption(option =>
      option.setName('valor')
        .setDescription('Novo valor para o campo')
        .setRequired(true)
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      const embed = createErrorEmbed('Você não tem permissão para configurar embeds.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const tipo = interaction.options.getString('tipo');
    const campo = interaction.options.getString('campo');
    const valor = interaction.options.getString('valor');

    const configKey = `embed_config_${tipo}_${interaction.guild.id}`;
    const config = db.get(configKey) || {};

    if (campo === 'cor') {
      if (!/^#[0-9A-F]{6}$/i.test(valor)) {
        const embed = createErrorEmbed('Cor inválida! Use o formato hexadecimal (#RRGGBB).');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      config.color = valor;
    } else if (campo === 'gif') {
      if (!valor.startsWith('http')) {
        const embed = createErrorEmbed('URL inválida! A URL deve começar com http:// ou https://');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      config.gif = valor;
    } else if (campo === 'descricao') {
      config.description = valor;
    }

    db.set(configKey, config);

    const embed = createSuccessEmbed(
      `Configuração de ${tipo} atualizada! ${campo}: ${valor}`
    );

    await interaction.reply({ embeds: [embed] });
  }
};