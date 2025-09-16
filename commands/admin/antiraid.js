const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configurar sistema anti-raid')
    .addIntegerOption(option =>
      option.setName('mensagens')
        .setDescription('Número máximo de mensagens permitidas')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    )
    .addIntegerOption(option =>
      option.setName('tempo')
        .setDescription('Janela de tempo em segundos')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(60)
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      const embed = createErrorEmbed('Você não tem permissão para configurar o anti-raid.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const maxMessages = interaction.options.getInteger('mensagens');
    const timeWindow = interaction.options.getInteger('tempo');

    if (!maxMessages && !timeWindow) {
      // Show current configuration
      const config = db.get(`antiraid_${interaction.guild.id}`) || { maxMessages: 5, timeWindow: 3 };
      
      const embed = createEmbed(
        'Configuração Anti-Raid',
        `**Máximo de mensagens:** ${config.maxMessages}\n**Janela de tempo:** ${config.timeWindow} segundos\n\n**Status:** ${config.enabled ? 'Ativado' : 'Desativado'}`,
        {
          fields: [
            {
              name: 'Como usar',
              value: '`/antiraid mensagens:5 tempo:3` - Configurar limites\n`/antiraid-toggle` - Ativar/desativar',
              inline: false
            }
          ]
        }
      );

      return interaction.reply({ embeds: [embed] });
    }

    const currentConfig = db.get(`antiraid_${interaction.guild.id}`) || { enabled: true };
    
    const newConfig = {
      maxMessages: maxMessages || currentConfig.maxMessages || 5,
      timeWindow: (timeWindow || currentConfig.timeWindow || 3) * 1000, // Convert to milliseconds
      enabled: currentConfig.enabled !== false
    };

    db.set(`antiraid_${interaction.guild.id}`, newConfig);

    const embed = createSuccessEmbed(
      `Anti-raid configurado! Máximo de ${newConfig.maxMessages} mensagens em ${newConfig.timeWindow / 1000} segundos.`
    );

    await interaction.reply({ embeds: [embed] });
  }
};