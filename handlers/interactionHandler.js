const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, Modal, TextInputComponent } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');
const { formatMarriageTime } = require('../utils/timeUtils');

module.exports = {
  async handleButtonInteraction(interaction, db) {
    const customId = interaction.customId;

    // Marriage interactions
    if (customId.startsWith('marry_')) {
      const [action, type, proposerId, targetId] = customId.split('_');
      
      if (interaction.user.id !== targetId) {
        return interaction.reply({
          content: 'Apenas a pessoa mencionada pode responder a este pedido!',
          ephemeral: true
        });
      }

      if (type === 'accept') {
        const marriageData = {
          partner: proposerId,
          date: new Date().toISOString(),
          guild: interaction.guild.id
        };
        
        db.set(`marriage_${interaction.guild.id}_${proposerId}`, {
          ...marriageData,
          partner: targetId
        });
        db.set(`marriage_${interaction.guild.id}_${targetId}`, marriageData);

        const embed = createEmbed(
          'Casamento Realizado!',
          `${interaction.user} aceitou o pedido de <@${proposerId}>! Parabéns ao casal!`
        );

        await interaction.update({ embeds: [embed], components: [] });
      } else if (type === 'reject') {
        const embed = createEmbed(
          'Pedido Recusado',
          `${interaction.user} recusou o pedido de casamento de <@${proposerId}>.`
        );

        await interaction.update({ embeds: [embed], components: [] });
      }
    }

    // Divorce button
    if (customId.startsWith('divorce_')) {
      const [action, guildId, userId] = customId.split('_');
      
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: 'Apenas o próprio usuário pode se divorciar!',
          ephemeral: true
        });
      }

      const marriage = db.get(`marriage_${guildId}_${userId}`);
      if (!marriage) {
        return interaction.reply({
          content: 'Você não está casado(a)!',
          ephemeral: true
        });
      }

      // Remove marriages
      db.delete(`marriage_${guildId}_${userId}`);
      db.delete(`marriage_${guildId}_${marriage.partner}`);

      const partner = await interaction.client.users.fetch(marriage.partner);
      const embed = createEmbed(
        'Divórcio Realizado',
        `${interaction.user} se divorciou de ${partner}. O relacionamento chegou ao fim.`
      );

      await interaction.update({ embeds: [embed], components: [] });

      // Notify ex-partner
      try {
        const dmEmbed = createEmbed(
          'Divórcio',
          `${interaction.user.username} se divorciou de você em **${interaction.guild.name}**.`
        );
        await partner.send({ embeds: [dmEmbed] });
      } catch (error) {
        // DMs disabled
      }
    }

    // Tinder interactions
    if (customId.startsWith('tinder_like_')) {
      const [action, type, guildId, fromUserId, toUserId] = customId.split('_');
      
      if (interaction.user.id !== fromUserId) {
        return interaction.reply({
          content: 'Você não pode usar este botão!',
          ephemeral: true
        });
      }

      // Add like
      const likesKey = `tinder_likes_${guildId}_${toUserId}`;
      const likes = db.get(likesKey) || [];
      
      if (!likes.includes(fromUserId)) {
        likes.push(fromUserId);
        db.set(likesKey, likes);

        // Check for mutual like (match)
        const userLikesKey = `tinder_likes_${guildId}_${fromUserId}`;
        const userLikes = db.get(userLikesKey) || [];
        
        if (userLikes.includes(toUserId)) {
          // IT'S A MATCH!
          const matchEmbed = createEmbed(
            'MATCH!',
            'Vocês deram like um no outro! Que tal começar uma conversa?'
          );

          try {
            const targetUser = await interaction.client.users.fetch(toUserId);
            await targetUser.send({ embeds: [matchEmbed] });
            await interaction.user.send({ embeds: [matchEmbed] });
          } catch (error) {
            // DMs disabled
          }

          const embed = createEmbed(
            'É um Match!',
            'Vocês se curtiram mutuamente! Mensagens privadas foram enviadas.'
          );

          return interaction.update({ embeds: [embed], components: [] });
        }
      }

      const embed = createEmbed(
        'Like Enviado!',
        'Seu like foi registrado. Se a pessoa também te curtir, vocês darão match!'
      );

      await interaction.update({ embeds: [embed], components: [] });
    }

    if (customId.startsWith('tinder_pass_')) {
      const embed = createEmbed(
        'Perfil Ignorado',
        'Você passou este perfil. Use `/tinder buscar` para ver outro perfil.'
      );

      await interaction.update({ embeds: [embed], components: [] });
    }

    // Tinder setup
    if (customId.startsWith('tinder_setup_')) {
      await this.showTinderSetupModal(interaction);
    }

    if (customId.startsWith('tinder_edit_')) {
      await this.showTinderSetupModal(interaction, true);
    }

    // Bio checker setup
    if (customId.startsWith('biochecker_setup_')) {
      await this.showBioCheckerSetup(interaction, db);
    }

    // Bio checker link configuration
    if (customId.startsWith('biochecker_link_')) {
      const modal = new Modal()
        .setCustomId(`biochecker_link_modal_${interaction.guild.id}`)
        .setTitle('Configurar Link Obrigatório');

      const linkInput = new TextInputComponent()
        .setCustomId('link')
        .setLabel('Link que deve estar na bio')
        .setStyle('SHORT')
        .setPlaceholder('https://discord.gg/seulink')
        .setRequired(true);

      const row = new MessageActionRow().addComponents(linkInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    // Bio verification final request (from verification embed)
    if (customId.startsWith('bio_verify_final_')) {
      const guildId = customId.split('_')[3];
      const config = db.get(`biochecker_${guildId}`);
      
      if (!config) {
        return interaction.reply({
          content: 'Sistema de bio checker não configurado.',
          ephemeral: true
        });
      }

      const channel = interaction.guild.channels.cache.get(config.channelId);
      const role = interaction.guild.roles.cache.get(config.roleId);

      if (!channel || !role) {
        return interaction.reply({
          content: 'Configuração inválida. Contacte um administrador.',
          ephemeral: true
        });
      }

      // Create approval buttons for moderators
      const approveButton = new MessageButton()
        .setCustomId(`bio_approve_${guildId}_${interaction.user.id}`)
        .setLabel('Aprovar')
        .setStyle('SUCCESS');

      const denyButton = new MessageButton()
        .setCustomId(`bio_deny_${guildId}_${interaction.user.id}`)
        .setLabel('Negar')
        .setStyle('DANGER');

      const row = new MessageActionRow().addComponents(approveButton, denyButton);

      const requestEmbed = createEmbed(
        'Solicitação de Verificação de Bio',
        `**Usuário:** ${interaction.user}\n**Link necessário:** ${config.requiredLink}\n**Cargo solicitado:** ${role}\n\n**Moderadores:** Verifiquem a bio do usuário e aprovem ou neguem a solicitação.`,
        {
          thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
        }
      );

      await channel.send({ embeds: [requestEmbed], components: [row] });

      const confirmEmbed = createEmbed(
        'Solicitação Enviada',
        'Sua solicitação de verificação foi enviada para os moderadores. Aguarde a análise!'
      );

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }

    // Bio verification approval/denial
    if (customId.startsWith('bio_approve_') || customId.startsWith('bio_deny_')) {
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({
          content: 'Apenas administradores podem aprovar/negar verificações.',
          ephemeral: true
        });
      }

      const [action, type, guildId, userId] = customId.split('_');
      const config = db.get(`biochecker_${guildId}`);
      
      if (!config) {
        return interaction.reply({
          content: 'Sistema não configurado.',
          ephemeral: true
        });
      }

      const member = interaction.guild.members.cache.get(userId);
      const role = interaction.guild.roles.cache.get(config.roleId);

      if (!member || !role) {
        return interaction.reply({
          content: 'Membro ou cargo não encontrado.',
          ephemeral: true
        });
      }

      if (type === 'approve') {
        try {
          await member.roles.add(role);
          
          const successEmbed = createEmbed(
            'Verificação Aprovada',
            `${member} foi aprovado por ${interaction.user} e recebeu o cargo ${role.name}!`
          );

          await interaction.update({ embeds: [successEmbed], components: [] });

          // Notify user
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
          console.error('Error adding role:', error);
          await interaction.reply({
            content: 'Erro ao adicionar cargo. Verifique as permissões.',
            ephemeral: true
          });
        }
      } else {
        const denialEmbed = createEmbed(
          'Verificação Negada',
          `A verificação de ${member} foi negada por ${interaction.user}.`
        );

        await interaction.update({ embeds: [denialEmbed], components: [] });

        // Notify user
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

    // Panel interactions
    if (customId.startsWith('painel_')) {
      const [action, tipo, guildId] = customId.split('_');
      await this.showPainelConfig(interaction, tipo, db);
    }
  },

  async showTinderSetupModal(interaction, isEdit = false) {
    const modal = new Modal()
      .setCustomId(`tinder_modal_${interaction.guild.id}_${interaction.user.id}`)
      .setTitle(isEdit ? 'Editar Perfil Tinder' : 'Criar Perfil Tinder');

    const bioInput = new TextInputComponent()
      .setCustomId('bio')
      .setLabel('Bio (máximo 100 caracteres)')
      .setStyle('PARAGRAPH')
      .setMaxLength(100)
      .setRequired(true);

    const ageInput = new TextInputComponent()
      .setCustomId('age')
      .setLabel('Idade')
      .setStyle('SHORT')
      .setMinLength(2)
      .setMaxLength(2)
      .setRequired(true);

    const interestsInput = new TextInputComponent()
      .setCustomId('interests')
      .setLabel('Interesses/Hobbies')
      .setStyle('SHORT')
      .setMaxLength(100)
      .setRequired(true);

    const row1 = new MessageActionRow().addComponents(bioInput);
    const row2 = new MessageActionRow().addComponents(ageInput);
    const row3 = new MessageActionRow().addComponents(interestsInput);

    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
  },

  async showBioCheckerSetup(interaction, db) {
    const embed = createEmbed(
      'Bio Checker - Configuração',
      'Configure o sistema de verificação de bio usando os menus abaixo:'
    );

    // Channel select menu
    const channelSelect = new MessageSelectMenu()
      .setCustomId(`biochecker_channel_${interaction.guild.id}`)
      .setPlaceholder('Selecione o canal para verificação')
      .addOptions(
        interaction.guild.channels.cache
          .filter(c => c.type === 'GUILD_TEXT')
          .first(25)
          .map(channel => ({
            label: `#${channel.name}`,
            value: channel.id,
            description: `Canal: ${channel.name}`
          }))
      );

    // Role select menu
    const roleSelect = new MessageSelectMenu()
      .setCustomId(`biochecker_role_${interaction.guild.id}`)
      .setPlaceholder('Selecione o cargo a ser dado')
      .addOptions(
        interaction.guild.roles.cache
          .filter(role => !role.managed && role.id !== interaction.guild.id)
          .first(25)
          .map(role => ({
            label: role.name,
            value: role.id,
            description: `Cargo: ${role.name}`
          }))
      );

    const setupLinkButton = new MessageButton()
      .setCustomId(`biochecker_link_${interaction.guild.id}`)
      .setLabel('Configurar Link')
      .setStyle('PRIMARY');

    const row1 = new MessageActionRow().addComponents(channelSelect);
    const row2 = new MessageActionRow().addComponents(roleSelect);
    const row3 = new MessageActionRow().addComponents(setupLinkButton);

    await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
  },

  async showPainelConfig(interaction, tipo, db) {
    const config = db.get(`embed_config_${tipo}_${interaction.guild.id}`) || {};

    const embed = createEmbed(
      `Configuração - ${tipo.toUpperCase()}`,
      `**Cor atual:** ${config.color || '#000000'}\n**GIF/Imagem:** ${config.gif || 'Nenhuma'}\n**Descrição:** ${config.description || 'Padrão'}`,
      {
        fields: [
          {
            name: 'Configurar',
            value: 'Use `/painel-config` para alterar as configurações',
            inline: false
          }
        ]
      }
    );

    await interaction.update({ embeds: [embed], components: [] });
  },

  async handleModalSubmit(interaction, db) {
    if (interaction.customId.startsWith('tinder_modal_')) {
      const [action, modal, guildId, userId] = interaction.customId.split('_');
      
      const bio = interaction.fields.getTextInputValue('bio');
      const age = parseInt(interaction.fields.getTextInputValue('age'));
      const interests = interaction.fields.getTextInputValue('interests');

      if (isNaN(age) || age < 13 || age > 99) {
        return interaction.reply({
          content: 'Idade inválida! Digite um número entre 13 e 99.',
          ephemeral: true
        });
      }

      const profile = { bio, age, interests };
      db.set(`tinder_profile_${guildId}_${userId}`, profile);

      const embed = createSuccessEmbed(
        'Perfil criado com sucesso! Use `/tinder buscar` para encontrar matches.'
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId.startsWith('biochecker_link_modal_')) {
      const guildId = interaction.customId.split('_')[3];
      const requiredLink = interaction.fields.getTextInputValue('link');

      const currentConfig = db.get(`biochecker_setup_${guildId}`) || {};
      currentConfig.requiredLink = requiredLink;
      db.set(`biochecker_setup_${guildId}`, currentConfig);

      // Check if configuration is complete
      if (currentConfig.channelId && currentConfig.roleId && currentConfig.requiredLink) {
        // Create final verification embed
        const channel = interaction.guild.channels.cache.get(currentConfig.channelId);
        const role = interaction.guild.roles.cache.get(currentConfig.roleId);

        if (channel && role) {
          const verifyButton = new MessageButton()
            .setCustomId(`bio_verify_final_${guildId}`)
            .setLabel('Verificar Bio')
            .setStyle('PRIMARY');

          const row = new MessageActionRow().addComponents(verifyButton);

          const verificationEmbed = createEmbed(
            'Verificação de Bio',
            `Para obter o cargo ${role}, você deve ter o link **${currentConfig.requiredLink}** em sua bio e clicar em \"Verificar Bio\".\\n\\nUm moderador irá analisar sua solicitação.`
          );

          await channel.send({ embeds: [verificationEmbed], components: [row] });

          // Save final config
          db.set(`biochecker_${guildId}`, currentConfig);
          db.delete(`biochecker_setup_${guildId}`);

          const embed = createSuccessEmbed(`Bio Checker configurado com sucesso!\\n\\nCanal: ${channel}\\nCargo: ${role}\\nLink: ${currentConfig.requiredLink}`);
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = createErrorEmbed('Erro: Canal ou cargo não encontrado.');
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } else {
        const embed = createSuccessEmbed('Link configurado! Agora selecione o canal e o cargo para finalizar.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },

  async handleSelectMenu(interaction, db) {
    if (interaction.customId.startsWith('biochecker_channel_')) {
      const guildId = interaction.customId.split('_')[2];
      const channelId = interaction.values[0];

      const currentConfig = db.get(`biochecker_setup_${guildId}`) || {};
      currentConfig.channelId = channelId;
      db.set(`biochecker_setup_${guildId}`, currentConfig);

      await interaction.reply({
        content: `Canal <#${channelId}> selecionado!`,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('biochecker_role_')) {
      const guildId = interaction.customId.split('_')[2];
      const roleId = interaction.values[0];

      const currentConfig = db.get(`biochecker_setup_${guildId}`) || {};
      currentConfig.roleId = roleId;
      db.set(`biochecker_setup_${guildId}`, currentConfig);

      await interaction.reply({
        content: `Cargo <@&${roleId}> selecionado!`,
        ephemeral: true
      });
    }
  }
};