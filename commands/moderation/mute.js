const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');
const { parseDuration, formatDuration } = require('../../utils/timeUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutar um membro do servidor')
    .addUserOption(option =>
      option.setName('membro')
        .setDescription('Membro para mutar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duracao')
        .setDescription('Duração do mute (ex: 1h, 30m, 7d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('motivo')
        .setDescription('Motivo do mute')
        .setRequired(false)
    ),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
      const embed = createErrorEmbed('Você não tem permissão para mutar membros.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const target = interaction.options.getMember('membro');
    const duration = interaction.options.getString('duracao');
    const reason = interaction.options.getString('motivo') || 'Não especificado';

    if (!target) {
      const embed = createErrorEmbed('Membro não encontrado.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      const embed = createErrorEmbed('Você não pode se mutar.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.permissions.has('ADMINISTRATOR')) {
      const embed = createErrorEmbed('Não é possível mutar um administrador.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const durationMs = parseDuration(duration);
    if (durationMs === 0 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      const embed = createErrorEmbed('Duração inválida. Use valores como: 30m, 2h, 7d (máximo 28 dias).');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await target.timeout(durationMs, reason);

      // Store mute info for persistence
      const muteData = {
        userId: target.id,
        duration: durationMs,
        timestamp: Date.now(),
        reason: reason,
        moderator: interaction.user.id
      };
      
      db.set(`mute_${interaction.guild.id}_${target.id}`, muteData);

      // Get embed configuration
      const muteConfig = db.get(`embed_config_mute_${interaction.guild.id}`) || {};

      const embed = createEmbed(
        'Membro Mutado',
        `${target} foi mutado por ${formatDuration(durationMs)}\n**Motivo:** ${reason}\n**Moderador:** ${interaction.user}`,
        {
          color: muteConfig.color || '#000000',
          image: muteConfig.gif || null
        }
      );

      if (muteConfig.description) {
        embed.setDescription(muteConfig.description.replace('{user}', target.toString()).replace('{duration}', formatDuration(durationMs)).replace('{reason}', reason));
      }

      await interaction.reply({ embeds: [embed] });

      // DM the user
      try {
        const dmEmbed = createEmbed(
          'Você foi mutado',
          `**Servidor:** ${interaction.guild.name}\n**Duração:** ${formatDuration(durationMs)}\n**Motivo:** ${reason}`
        );
        await target.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled
      }

      // Auto-unmute after duration
      setTimeout(async () => {
        try {
          const member = interaction.guild.members.cache.get(target.id);
          if (member && member.communicationDisabledUntil) {
            await member.timeout(null);
            db.delete(`mute_${interaction.guild.id}_${target.id}`);
          }
        } catch (error) {
          console.error('Erro ao desmutar automaticamente:', error);
        }
      }, durationMs);

    } catch (error) {
      console.error('Erro ao mutar:', error);
      const embed = createErrorEmbed('Erro ao mutar o membro. Verifique se tenho permissões adequadas.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};