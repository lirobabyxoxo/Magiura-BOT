const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um membro do servidor')
    .addUserOption(option =>
      option.setName('membro')
        .setDescription('Membro para banir')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('motivo')
        .setDescription('Motivo do banimento')
        .setRequired(false)
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('BAN_MEMBERS')) {
      const embed = createErrorEmbed('Você não tem permissão para banir membros.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const target = interaction.options.getMember('membro') || interaction.options.getUser('membro');
    const reason = interaction.options.getString('motivo') || 'Não especificado';

    if (!target) {
      const embed = createErrorEmbed('Usuário não encontrado.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      const embed = createErrorEmbed('Você não pode se banir.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.permissions && target.permissions.has('ADMINISTRATOR')) {
      const embed = createErrorEmbed('Não é possível banir um administrador.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      // Get embed configuration
      const banConfig = db.get(`embed_config_ban_${interaction.guild.id}`) || {};

      const embed = createEmbed(
        'Membro Banido',
        `${target} foi banido do servidor\n**Motivo:** ${reason}\n**Moderador:** ${interaction.user}`,
        {
          color: banConfig.color || '#000000',
          image: banConfig.gif || null
        }
      );

      if (banConfig.description) {
        embed.setDescription(banConfig.description.replace('{user}', target.toString()).replace('{reason}', reason));
      }

      await interaction.guild.members.ban(target, { reason });
      await interaction.reply({ embeds: [embed] });

      // DM the user
      try {
        const dmEmbed = createEmbed(
          'Você foi banido',
          `**Servidor:** ${interaction.guild.name}\n**Motivo:** ${reason}`
        );
        await target.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('Error banning user:', error);
      const embed = createErrorEmbed('Erro ao banir o usuário. Verifique se tenho permissões adequadas.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};