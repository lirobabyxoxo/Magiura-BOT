const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { createEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('biochecker')
    .setDescription('Sistema de verificação de bio interativo')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configurar o sistema de verificação de bio')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Aprovar uma verificação de bio')
        .addUserOption(option =>
          option.setName('membro')
            .setDescription('Membro para aprovar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deny')
        .setDescription('Negar uma verificação de bio')
        .addUserOption(option =>
          option.setName('membro')
            .setDescription('Membro para negar')
            .setRequired(true)
        )
    ),

  async execute(interaction, db) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        const embed = createErrorEmbed('Você não tem permissão para usar este comando.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Check if already configured
      const config = db.get(`biochecker_${interaction.guild.id}`);

      if (config) {
        // Show current config
        const channel = interaction.guild.channels.cache.get(config.channelId);
        const role = interaction.guild.roles.cache.get(config.roleId);

        const embed = createEmbed(
          'Configuração Atual do Bio Checker',
          `**Canal:** ${channel || 'Canal não encontrado'}\n**Cargo:** ${role || 'Cargo não encontrado'}\n**Link:** ${config.requiredLink}`
        );

        const reconfigureButton = new MessageButton()
          .setCustomId(`biochecker_setup_${interaction.guild.id}`)
          .setLabel('Reconfigurar')
          .setStyle('PRIMARY');

        const row = new MessageActionRow().addComponents(reconfigureButton);

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // Start setup process
      const setupButton = new MessageButton()
        .setCustomId(`biochecker_setup_${interaction.guild.id}`)
        .setLabel('Iniciar Configuração')
        .setStyle('PRIMARY');

      const row = new MessageActionRow().addComponents(setupButton);

      const embed = createEmbed(
        'Bio Checker - Configuração',
        'Clique no botão abaixo para iniciar a configuração interativa do sistema de verificação de bio.'
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
    else if (subcommand === 'approve') {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        const embed = createErrorEmbed('Apenas administradores podem aprovar verificações.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const member = interaction.options.getMember('membro');
      const config = db.get(`biochecker_${interaction.guild.id}`);

      if (!config) {
        const embed = createErrorEmbed('Sistema de bio checker não configurado. Use `/biochecker setup` primeiro.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!member) {
        const embed = createErrorEmbed('Membro não encontrado.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const role = interaction.guild.roles.cache.get(config.roleId);
      if (!role) {
        const embed = createErrorEmbed('Cargo de verificação não encontrado.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      try {
        await member.roles.add(role);
        const embed = createSuccessEmbed(`${member} foi aprovado e recebeu o cargo ${role.name}!`);
        await interaction.reply({ embeds: [embed] });

        // DM the user
        try {
          const dmEmbed = createEmbed(
            'Verificação Aprovada!',
            `Sua verificação de bio foi aprovada em **${interaction.guild.name}**! Você recebeu o cargo **${role.name}**.`
          );
          await member.send({ embeds: [dmEmbed] });
        } catch (error) {
          // DM disabled
        }
      } catch (error) {
        const embed = createErrorEmbed('Erro ao adicionar cargo. Verifique as permissões.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
    else if (subcommand === 'deny') {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        const embed = createErrorEmbed('Apenas administradores podem negar verificações.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const member = interaction.options.getMember('membro');
      const config = db.get(`biochecker_${interaction.guild.id}`);

      if (!config) {
        const embed = createErrorEmbed('Sistema de bio checker não configurado.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!member) {
        const embed = createErrorEmbed('Membro não encontrado.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const role = interaction.guild.roles.cache.get(config.roleId);
      if (role && member.roles.cache.has(config.roleId)) {
        await member.roles.remove(role);
      }

      const embed = createEmbed(
        'Verificação Negada',
        `A verificação de ${member} foi negada/removida por ${interaction.user}.`
      );
      await interaction.reply({ embeds: [embed] });

      // DM the user
      try {
        const dmEmbed = createEmbed(
          'Verificação Negada',
          `Sua verificação de bio foi negada em **${interaction.guild.name}**. Verifique se o link está correto em sua bio e tente novamente.`
        );
        await member.send({ embeds: [dmEmbed] });
      } catch (error) {
        // DM disabled
      }
    }
  }
};