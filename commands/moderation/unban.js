const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanir um usuário do servidor')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('ID do usuário para desbanir')
        .setRequired(true)
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('BAN_MEMBERS')) {
      const embed = createErrorEmbed('Você não tem permissão para desbanir membros.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const userId = interaction.options.getString('userid');

    if (!/^\d{17,19}$/.test(userId)) {
      const embed = createErrorEmbed('ID de usuário inválido.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const user = await interaction.client.users.fetch(userId);
      await interaction.guild.members.unban(userId, 'Unban command');

      // Get embed configuration
      const banConfig = db.get(`embed_config_ban_${interaction.guild.id}`) || {};

      const embed = createEmbed(
        'Usuário Desbanido',
        `${user.username} foi desbanido por ${interaction.user}`,
        {
          color: banConfig.color || '#000000',
          thumbnail: user.displayAvatarURL({ dynamic: true })
        }
      );

      await interaction.reply({ embeds: [embed] });

      // DM the user
      try {
        const dmEmbed = createEmbed(
          'Você foi desbanido',
          `**Servidor:** ${interaction.guild.name}\n**Moderador:** ${interaction.user.username}`
        );
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('Error unbanning user:', error);
      const embed = createErrorEmbed('Erro ao desbanir o usuário. Verifique se o ID está correto e se o usuário está banido.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};