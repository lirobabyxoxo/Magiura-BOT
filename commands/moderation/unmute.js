const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Desmutar um membro do servidor')
    .addUserOption(option =>
      option.setName('membro')
        .setDescription('Membro para desmutar')
        .setRequired(true)
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
      const embed = createErrorEmbed('Você não tem permissão para desmutar membros.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const target = interaction.options.getMember('membro');

    if (!target) {
      const embed = createErrorEmbed('Membro não encontrado.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await target.timeout(null);

      // Remove from database
      db.delete(`mute_${interaction.guild.id}_${target.id}`);

      // Get embed configuration
      const muteConfig = db.get(`embed_config_mute_${interaction.guild.id}`) || {};

      const embed = createEmbed(
        'Membro Desmutado',
        `${target} foi desmutado por ${interaction.user}`,
        {
          color: muteConfig.color || '#000000'
        }
      );

      await interaction.reply({ embeds: [embed] });

      // DM the user
      try {
        const dmEmbed = createEmbed(
          'Você foi desmutado',
          `**Servidor:** ${interaction.guild.name}\n**Moderador:** ${interaction.user}`
        );
        await target.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('Erro ao desmutar:', error);
      const embed = createErrorEmbed('Erro ao desmutar o membro. Ele pode não estar mutado.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};