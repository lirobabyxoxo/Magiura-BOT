const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tinder')
    .setDescription('Sistema de matches do servidor')
    .addSubcommand(subcommand =>
      subcommand
        .setName('perfil')
        .setDescription('Ver ou configurar seu perfil')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('buscar')
        .setDescription('Buscar matches no servidor')
    ),

  async execute(interaction, db) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (subcommand === 'perfil') {
      const profile = db.get(`tinder_profile_${guildId}_${userId}`);

      if (!profile) {
        // Setup profile
        const setupButton = new MessageButton()
          .setCustomId(`tinder_setup_${guildId}_${userId}`)
          .setLabel('Criar Perfil')
          .setStyle('PRIMARY');

        const row = new MessageActionRow().addComponents(setupButton);

        const embed = createEmbed(
          'Tinder - Perfil',
          'Você ainda não tem um perfil no Tinder! Clique no botão abaixo para criar um.'
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // Show current profile
      const likes = db.get(`tinder_likes_${guildId}_${userId}`) || [];

      const editButton = new MessageButton()
        .setCustomId(`tinder_edit_${guildId}_${userId}`)
        .setLabel('Editar Perfil')
        .setStyle('SECONDARY');

      const row = new MessageActionRow().addComponents(editButton);

      const embed = createEmbed(
        `Perfil de ${interaction.user.username}`,
        `**Bio:** ${profile.bio}\n**Idade:** ${profile.age} anos\n**Interesses:** ${profile.interests}\n**Likes recebidos:** ${likes.length}`,
        {
          thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
        }
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (subcommand === 'buscar') {
      const userProfile = db.get(`tinder_profile_${guildId}_${userId}`);

      if (!userProfile) {
        const embed = createEmbed(
          'Erro',
          'Você precisa criar um perfil primeiro! Use `/tinder perfil`.'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Get all profiles except user's own
      const allData = db.all();
      const profiles = Object.keys(allData)
        .filter(key => key.startsWith(`tinder_profile_${guildId}_`) && !key.includes(userId))
        .map(key => ({
          userId: key.split('_')[3],
          profile: allData[key]
        }))
        .filter(p => interaction.guild.members.cache.has(p.userId));

      if (profiles.length === 0) {
        const embed = createEmbed(
          'Tinder',
          'Não há outros perfis disponíveis no momento.'
        );
        return interaction.reply({ embeds: [embed] });
      }

      // Show random profile
      const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
      const targetUser = await interaction.client.users.fetch(randomProfile.userId);
      const likes = db.get(`tinder_likes_${guildId}_${randomProfile.userId}`) || [];

      const likeButton = new MessageButton()
        .setCustomId(`tinder_like_${guildId}_${userId}_${randomProfile.userId}`)
        .setLabel('Curtir')
        .setStyle('SUCCESS');

      const passButton = new MessageButton()
        .setCustomId(`tinder_pass_${guildId}_${userId}_${randomProfile.userId}`)
        .setLabel('Passar')
        .setStyle('SECONDARY');

      const row = new MessageActionRow().addComponents(likeButton, passButton);

      const embed = createEmbed(
        `${targetUser.username}, ${randomProfile.profile.age} anos`,
        `**Bio:** ${randomProfile.profile.bio}\n**Interesses:** ${randomProfile.profile.interests}\n**Likes:** ${likes.length}`,
        {
          thumbnail: targetUser.displayAvatarURL({ dynamic: true })
        }
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }
};