const { Client, Intents, MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

// Simple database replacement
const dbPath = path.join(__dirname, "database.json");
const db = {
  get: (key) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      return data[key] || null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      } catch {}
      data[key] = value;
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return value;
    } catch {
      return null;
    }
  },
  delete: (key) => {
    try {
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      } catch {}
      delete data[key];
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  },
};

// Create client with basic intents
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS
  ],
});

console.log("Starting bot...");

// Commands
const commands = new Map();

// Help command
commands.set("help", {
  run: (client, message, args) => {
    const embed = new MessageEmbed()
      .setTitle("Help")
      .setDescription(
        `**📋 Comandos de Verificação:**
> \`${config.prefix}setverify\`: Setar o canal de verificação
> \`${config.prefix}setrole\`: Setar o cargo que será dado quando verificar
> \`${config.prefix}setrrole\`: Setar o cargo de random
> \`${config.prefix}verify\`: Verificar
> \`${config.prefix}rvrole\`: Resetar o cargo de verificação
> \`${config.prefix}rvchannel\`: Resetar o canal de verificação
> \`${config.prefix}rrvrole\`: Resetar o cargo de random
> \`${config.prefix}resetallverify\`: Remover cargo de verificação de todos os membros

**🎉 Comandos de Boas-Vindas:**
> \`${config.prefix}great\`: Abrir painel de configuração de boas-vindas
> \`${config.prefix}setwelcome\`: Definir canal de boas-vindas
> \`${config.prefix}setwelcomerole\`: Definir cargo automático
> \`${config.prefix}setautodelete\`: Configurar auto-delete
> \`${config.prefix}testwelcome\`: Testar mensagem de boas-vindas
> \`${config.prefix}resetwelcome\`: Resetar configurações de boas-vindas

**💕 Comandos de Relacionamento:**
> \`${config.prefix}marry @membro\`: Casar com alguém

**🛡️ Comandos de Moderação:**
> \`${config.prefix}mute @membro tempo motivo\`: Mutar membro (até 28d)
> \`${config.prefix}unmute @membro\`: Desmutar membro
> \`${config.prefix}unban ID\`: Desbanir por ID
> \`${config.prefix}painel\`: Painel de administração
> \`${config.prefix}antiraid num tempo\`: Configurar anti-raid

**📊 Comandos de Informação:**
> \`${config.prefix}serverinfo\`: Informações do servidor

**🎮 Comandos Divertidos:**
> \`${config.prefix}tinder\`: Sistema de match aleatório`,
      )
      .setColor("#000000")
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
});

// Set verify channel
commands.set("setverify", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.channel.send(
        "Por favor, mencione o canal de verificação.",
      );
    }
    db.set(`verify_${message.guild.id}`, channel.id);
    message.channel.send(
      `Agora ${channel} foi setado como canal de verificação`,
    );
  },
});

// Set verification role
commands.set("setrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send(
        "Por favor, mencione o cargo que será dado na verificação.",
      );
    }
    db.set(`verole_${message.guild.id}`, role.id);
    message.channel.send(`Agora \`${role}\` será dado quando eles verificarem`);
  },
});

// Set removal role
commands.set("setrrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send(
        "Por favor, mencione o cargo que será removido na verificação.",
      );
    }
    db.set(`srrole_${message.guild.id}`, role.id);
    message.channel.send(
      `Agora \`${role}\` será tirado quando eles verificarem`,
    );
  },
});

// Verify command
commands.set("verify", {
  run: async (client, message, args) => {
    const rRole = db.get(`verole_${message.guild.id}`);
    const rerole = db.get(`srrole_${message.guild.id}`);
    const chx = db.get(`verify_${message.guild.id}`);

    if (!chx) {
      return message.channel.send(
        "Canal de verificação não configurado. Use `.setverify #channel` para configurar.",
      );
    }

    if (message.channel.id !== chx) {
      return; // Only work in verification channel
    }

    if (!rRole) {
      return message.channel.send(
        "O cargo de verificação não foi configurado. Use `.setrole @role` para configurar.",
      );
    }

    const myRole = message.guild.roles.cache.get(rRole);
    if (!myRole) {
      return message.channel.send(
        "O cargo de verificação não existe mais. Entre em contato com um administrador.",
      );
    }

    try {
      await message.member.roles.add(myRole);

      if (rerole) {
        const reerole = message.guild.roles.cache.get(rerole);
        if (reerole) {
          await message.member.roles.remove(reerole);
        }
      }

      message.author
        .send(`Você foi verificado(a) em ${message.guild.name}`)
        .catch(() => {
          message.channel.send(
            `${message.member}, você foi verificado em ${message.guild.name}, porém não foi possível enviar uma mensagem privada. Verifique suas configurações de privacidade.`,
          );
        });
    } catch (error) {
      message.channel.send(
        "Não foi possível verificar você. Por favor, contate um administrador.",
      );
    }
  },
});

// Add aliases
commands.set("accept", commands.get("verify"));
commands.set("sv", commands.get("setverify"));
commands.set("sr", commands.get("setrole"));
commands.set("srr", commands.get("setrrole"));


// Reset commands
commands.set("rvchannel", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`verify_${message.guild.id}`);
    message.channel.send("O canal de verificação foi resetado");
  },
});

commands.set("rvrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`verole_${message.guild.id}`);
    message.channel.send("O cargo de verificação foi resetado");
  },
});

commands.set("rrvrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`srrole_${message.guild.id}`);
    message.channel.send("O cargo de random foi resetado");
  },
});

// Reset all verified members
commands.set("resetallverify", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }

    const verificationRoleId = db.get(`verole_${message.guild.id}`);
    if (!verificationRoleId) {
      return message.channel.send(
        "❌ Cargo de verificação não configurado. Use `.setrole @cargo` primeiro.",
      );
    }

    const verificationRole = message.guild.roles.cache.get(verificationRoleId);
    if (!verificationRole) {
      return message.channel.send(
        "❌ Cargo de verificação não encontrado. Verifique se ainda existe.",
      );
    }

    const statusMessage = await message.channel.send("⏳ Processando... Removendo cargo de verificação de todos os membros...");

    try {
      // Get all members with the verification role
      await message.guild.members.fetch();
      const membersWithRole = message.guild.members.cache.filter(member => 
        member.roles.cache.has(verificationRoleId)
      );

      if (membersWithRole.size === 0) {
        return statusMessage.edit("ℹ️ Nenhum membro possui o cargo de verificação.");
      }

      let successCount = 0;
      let errorCount = 0;

      // Remove role from all members
      for (const [memberId, member] of membersWithRole) {
        try {
          await member.roles.remove(verificationRole);
          successCount++;
        } catch (error) {
          console.error(`Erro ao remover cargo do membro ${member.user.tag}:`, error);
          errorCount++;
        }
      }

      const embed = new MessageEmbed()
        .setTitle("✅ Reset de Verificação Concluído")
        .setDescription(
          `**Resultados da operação:**
          
🎯 **Total de membros processados:** ${membersWithRole.size}
✅ **Cargos removidos com sucesso:** ${successCount}
❌ **Erros encontrados:** ${errorCount}

${errorCount > 0 ? '⚠️ Alguns erros podem ser devido a permissões ou membros que saíram do servidor.' : '🎉 Todos os cargos foram removidos com sucesso!'}`
        )
        .setColor(errorCount > 0 ? "#ff9900" : "#00ff00")
        .setTimestamp();

      await statusMessage.edit({ content: null, embeds: [embed] });

    } catch (error) {
      console.error("Erro durante reset de verificação:", error);
      await statusMessage.edit("❌ Erro durante o processo. Verifique as permissões do bot e tente novamente.");
    }
  },
});

// Welcome system configuration
commands.set("great", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "você não tem permissão para usar este comando.",
      );
    }

    const embed = new MessageEmbed()
      .setTitle("painel de Controle - sistema de boas-vindas")
      .setDescription(
        `**status das configurações:**
        
**canal de boas-vindas:**
> ${await getWelcomeChannelText(message.guild.id, client)}

**cargo automático:**
> ${await getWelcomeRoleText(message.guild.id, client)}

**auto-delete:**
> ${getWelcomeDeleteText(message.guild.id)}

**comandos de configuração:**
> \`${config.prefix}setwelcome #canal\` - Definir canal de boas-vindas
> \`${config.prefix}setwelcomerole @cargo\` - Definir cargo automático  
> \`${config.prefix}setautodelete 10\` - Auto-delete após X segundos (0 = desabilitado)
> \`${config.prefix}testwelcome\` - Testar sistema de boas-vindas
> \`${config.prefix}resetwelcome\` - Resetar todas as configurações

**💡 Dica:** Use os comandos acima para configurar seu sistema de boas-vindas personalizado!

**aliases Disponíveis:** \`sw\`, \`swr\`, \`sad\`, \`tw\`, \`rw\`
**para ver todos os comandos:** \`${config.prefix}help\`"`
      )
      .setColor("#000000")
      .setTimestamp()
      .setFooter("painel de Controle Interativo");

    message.channel.send({ embeds: [embed] });
  },
});

// Set welcome channel
commands.set("setwelcome", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "você não tem permissão para usar este comando.",
      );
    }
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.channel.send(
        "por favor, mencione o canal onde as mensagens de boas-vindas serão enviadas.",
      );
    }
    db.set(`welcome_channel_${message.guild.id}`, channel.id);
    message.channel.send(
      `Canal de boas-vindas definido para ${channel}`,
    );
  },
});

// Set welcome role
commands.set("setwelcomerole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando, verme.",
      );
    }
    const role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send(
        "Por favor, mencione o cargo que será dado automaticamente aos novos membros.",
      );
    }
    db.set(`welcome_role_${message.guild.id}`, role.id);
    message.channel.send(
      `Cargo automático definido para \`${role.name}\``,
    );
  },
});

// Set auto-delete time
commands.set("setautodelete", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0) {
      return message.channel.send(
        "Por favor, forneça um número válido de segundos (0 para desabilitar auto-delete).",
      );
    }
    if (seconds > 300) {
      return message.channel.send(
        "O tempo máximo para auto-delete é 300 segundos (5 minutos).",
      );
    }
    
    if (seconds === 0) {
      db.delete(`welcome_autodelete_${message.guild.id}`);
      message.channel.send("✅ Auto-delete desabilitado para mensagens de boas-vindas.");
    } else {
      db.set(`welcome_autodelete_${message.guild.id}`, seconds);
      message.channel.send(
        `✅ Auto-delete definido para ${seconds} segundos.`,
      );
    }
  },
});

// Reset welcome settings
commands.set("resetwelcome", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`welcome_channel_${message.guild.id}`);
    db.delete(`welcome_role_${message.guild.id}`);
    db.delete(`welcome_autodelete_${message.guild.id}`);
    message.channel.send("✅ Todas as configurações de boas-vindas foram resetadas.");
  },
});

// Test welcome message
commands.set("testwelcome", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    
    const welcomeChannelId = db.get(`welcome_channel_${message.guild.id}`);
    if (!welcomeChannelId) {
      return message.channel.send(
        "❌ Canal de boas-vindas não configurado. Use `.setwelcome #canal` primeiro.",
      );
    }
    
    const welcomeChannel = client.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) {
      return message.channel.send(
        "❌ Canal de boas-vindas não encontrado. Verifique se ainda existe.",
      );
    }
    
    await sendWelcomeMessage(client, message.member, true);
    message.channel.send("✅ Mensagem de teste enviada!");
  },
});

// Unban command
commands.set("unban", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("BAN_MEMBERS")) {
      return message.channel.send("❌ Você não tem permissão para usar este comando.");
    }
    
    const userId = args[0];
    if (!userId) {
      return message.channel.send("🆔 Forneça o ID do usuário para desbanir. Exemplo: `.unban 123456789`");
    }
    
    try {
      await message.guild.members.unban(userId);
      
      // Get custom embed configuration
      const banConfig = db.get(`embed_config_ban_${message.guild.id}`) || {};
      
      const embed = new MessageEmbed()
        .setTitle('🔓 Usuário Desbanido')
        .setDescription(banConfig.description ? banConfig.description.replace('banido', 'desbanido') : `Usuário <@${userId}> foi desbanido`)
        .addField('👮 Moderador', message.author.toString())
        .setColor(banConfig.color || '#51cf66')
        .setTimestamp();
      
      if (banConfig.gif) {
        embed.setImage(banConfig.gif);
      }
      
      message.channel.send({ embeds: [embed] });
      
    } catch (error) {
      console.error('Erro ao desbanir usuário:', error);
      message.channel.send("❌ Erro ao desbanir o usuário. Verifique se o ID está correto e se o usuário está banido.");
    }
  },
});

// Anti-raid system
const messageTracker = new Map();

commands.set("antiraid", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send("❌ Você não tem permissão para usar este comando.");
    }
    
    const maxMessages = parseInt(args[0]);
    const timeWindow = parseInt(args[1]) || 5; // seconds
    
    if (!maxMessages || maxMessages < 1 || maxMessages > 20) {
      return message.channel.send("⚠️ Configure o anti-raid. Exemplo: `.antiraid 5 3` (5 mensagens em 3 segundos)");
    }
    
    const raidConfig = {
      maxMessages: maxMessages,
      timeWindow: timeWindow * 1000,
      enabled: true
    };
    
    db.set(`antiraid_${message.guild.id}`, raidConfig);
    
    const embed = new MessageEmbed()
      .setTitle('🛡️ Anti-Raid Configurado')
      .setDescription(`Sistema anti-raid ativado!\n\n**Limite:** ${maxMessages} mensagens em ${timeWindow} segundos`)
      .setColor('#e74c3c')
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  },
});

// Tinder command
commands.set("tinder", {
  run: async (client, message, args) => {
    const members = message.guild.members.cache.filter(member => 
      !member.user.bot && member.id !== message.author.id
    );
    
    if (members.size === 0) {
      return message.channel.send("😔 Não há membros disponíveis para o Tinder!");
    }
    
    const randomMember = members.random();
    
    // Generate random bio descriptions
    const descriptions = [
      "Ama café e aventuras! ☕✨",
      "Viciado(a) em séries e pizza 🍕📺",
      "Sonha em viajar pelo mundo 🌍✈️",
      "Gamer nas horas vagas 🎮",
      "Amante de livros e música 📚🎵",
      "Sempre de bom humor! 😄",
      "Procurando alguém para assistir filmes 🎬",
      "Especialista em memes 😂",
      "Adora animais e natureza 🌿🐕",
      "Chef de cozinha improvisado 👨‍🍳"
    ];
    
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const age = Math.floor(Math.random() * 15) + 18; // 18-32
    
    const embed = new MessageEmbed()
      .setTitle('💖 Tinder do Servidor')
      .setDescription(`**${randomMember.displayName}, ${age} anos**\n\n${randomDescription}`)
      .setThumbnail(randomMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addField('💬 Status', 'Online no Discord', true)
      .addField('🎯 Interesses', 'Discord, jogos, conversas', true)
      .setColor('#e91e63')
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  },
});

// Bio checker command
commands.set("biochecker", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send("❌ Você não tem permissão para usar este comando.");
    }
    
    if (args[0] === 'setup') {
      const role = message.mentions.roles.first();
      const link = args.slice(2).join(' ');
      
      if (!role || !link) {
        return message.channel.send('❌ Use: `.biochecker setup @cargo https://discord.gg/seulink`');
      }
      
      const config = {
        roleId: role.id,
        requiredLink: link,
        channelId: message.channel.id
      };
      
      db.set(`biochecker_${message.guild.id}`, config);
      
      const verifyButton = new MessageButton()
        .setCustomId(`bio_verify_${message.guild.id}`)
        .setLabel('🔍 Solicitar Verificação')
        .setStyle('PRIMARY');
      
      const row = new MessageActionRow().addComponents(verifyButton);
      
      const embed = new MessageEmbed()
        .setTitle('🔍 Verificador de Bio')
        .setDescription(`Para ter ${role} você deverá colocar o link **${link}** na sua bio e clicar em "Solicitar Verificação".\n\nUm moderador irá verificar manualmente e conceder o cargo.\n\n⚠️ **Importante:** Se você remover o link da bio, o cargo pode ser removido!`)
        .setColor('#3498db')
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed], components: [row] });
      return message.channel.send('✅ Sistema de bio checker configurado!');
    }
    
    if (args[0] === 'approve' || args[0] === 'deny') {
      if (!message.member.permissions.has("ADMINISTRATOR")) {
        return message.channel.send("❌ Apenas administradores podem aprovar/negar verificações.");
      }
      
      const userId = args[1];
      if (!userId) {
        return message.channel.send('❌ Use: `.biochecker approve/deny @membro`');
      }
      
      const member = message.mentions.members.first() || message.guild.members.cache.get(userId);
      if (!member) {
        return message.channel.send('❌ Membro não encontrado.');
      }
      
      const config = db.get(`biochecker_${message.guild.id}`);
      if (!config) {
        return message.channel.send('❌ Sistema não configurado.');
      }
      
      const role = message.guild.roles.cache.get(config.roleId);
      if (!role) {
        return message.channel.send('❌ Cargo de verificação não encontrado.');
      }
      
      if (args[0] === 'approve') {
        await member.roles.add(role);
        message.channel.send(`✅ ${member} foi aprovado e recebeu o cargo ${role.name}!`);
        member.user.send(`✅ Sua verificação de bio foi aprovada em **${message.guild.name}**! Você recebeu o cargo **${role.name}**.`).catch(() => {});
      } else {
        await member.roles.remove(role);
        message.channel.send(`❌ Verificação de ${member} foi negada/removida.`);
        member.user.send(`❌ Sua verificação de bio foi negada em **${message.guild.name}**.`).catch(() => {});
      }
      
      return;
    }
    
    const config = db.get(`biochecker_${message.guild.id}`);
    if (!config) {
      return message.channel.send('❌ Sistema não configurado. Use: `.biochecker setup @cargo link`');
    }
    
    const embed = new MessageEmbed()
      .setTitle('⚙️ Configuração do Bio Checker')
      .addField('🏅 Cargo', `<@&${config.roleId}>`, true)
      .addField('🔗 Link Obrigatório', config.requiredLink, true)
      .addField('📺 Canal', `<#${config.channelId}>`, true)
      .addField('🛠️ Comandos de Moderação', '`.biochecker approve @membro` - Aprovar\n`.biochecker deny @membro` - Negar/Remover', false)
      .setColor('#3498db')
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  },
});

// Admin panel command
commands.set("painel", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send("❌ Você não tem permissão para usar este comando.");
    }
    
    const embed = new MessageEmbed()
      .setTitle('🔧 Painel de Administração')
      .setDescription('Escolha uma opção para configurar:')
      .addField('📝 Configurar Embed de Mute', '`.painel mute` - Personalizar embeds de mute', false)
      .addField('🔨 Configurar Embed de Ban', '`.painel ban` - Personalizar embeds de ban', false)
      .addField('🛡️ Sistema Anti-Raid', '`.antiraid [num] [tempo]` - Configurar rate limit', false)
      .addField('👋 Sistema de Boas-vindas', '`.great` - Configurar sistema de welcome', false)
      .addField('💍 Sistema de Casamento', 'Automático - use `.marry @membro`', false)
      .setColor('#2c3e50')
      .setTimestamp();
    
    if (args[0] === 'mute') {
      const muteConfig = db.get(`embed_config_mute_${message.guild.id}`) || {};
      
      const configEmbed = new MessageEmbed()
        .setTitle('⚙️ Configuração de Embed - Mute')
        .setDescription('Para personalizar use: `.painel mute set [campo] [valor]`\n\n**Campos disponíveis:**\n• `cor` - Cor da embed (hex)\n• `gif` - URL do GIF\n• `descricao` - Descrição personalizada')
        .addField('🎨 Cor atual', muteConfig.color || '#ff6b6b', true)
        .addField('🎬 GIF atual', muteConfig.gif || 'Nenhum', true)
        .addField('📝 Descrição', muteConfig.description || 'Padrão', false)
        .setColor(muteConfig.color || '#ff6b6b');
      
      if (muteConfig.gif) {
        configEmbed.setImage(muteConfig.gif);
      }
      
      return message.channel.send({ embeds: [configEmbed] });
    }
    
    if (args[0] === 'ban') {
      const banConfig = db.get(`embed_config_ban_${message.guild.id}`) || {};
      
      const configEmbed = new MessageEmbed()
        .setTitle('⚙️ Configuração de Embed - Ban')
        .setDescription('Para personalizar use: `.painel ban set [campo] [valor]`\n\n**Campos disponíveis:**\n• `cor` - Cor da embed (hex)\n• `gif` - URL do GIF\n• `descricao` - Descrição personalizada')
        .addField('🎨 Cor atual', banConfig.color || '#e74c3c', true)
        .addField('🎬 GIF atual', banConfig.gif || 'Nenhum', true)
        .addField('📝 Descrição', banConfig.description || 'Padrão', false)
        .setColor(banConfig.color || '#e74c3c');
      
      if (banConfig.gif) {
        configEmbed.setImage(banConfig.gif);
      }
      
      return message.channel.send({ embeds: [configEmbed] });
    }
    
    if (args[0] === 'mute' && args[1] === 'set') {
      const field = args[2];
      const value = args.slice(3).join(' ');
      
      if (!field || !value) {
        return message.channel.send('❌ Use: `.painel mute set [campo] [valor]`');
      }
      
      const muteConfig = db.get(`embed_config_mute_${message.guild.id}`) || {};
      
      if (field === 'cor') {
        if (!/^#[0-9A-F]{6}$/i.test(value)) {
          return message.channel.send('❌ Cor inválida! Use formato hex: #ff0000');
        }
        muteConfig.color = value;
      } else if (field === 'gif') {
        muteConfig.gif = value;
      } else if (field === 'descricao') {
        muteConfig.description = value;
      } else {
        return message.channel.send('❌ Campo inválido! Use: cor, gif ou descricao');
      }
      
      db.set(`embed_config_mute_${message.guild.id}`, muteConfig);
      message.channel.send('✅ Configuração de mute atualizada!');
      return;
    }
    
    if (args[0] === 'ban' && args[1] === 'set') {
      const field = args[2];
      const value = args.slice(3).join(' ');
      
      if (!field || !value) {
        return message.channel.send('❌ Use: `.painel ban set [campo] [valor]`');
      }
      
      const banConfig = db.get(`embed_config_ban_${message.guild.id}`) || {};
      
      if (field === 'cor') {
        if (!/^#[0-9A-F]{6}$/i.test(value)) {
          return message.channel.send('❌ Cor inválida! Use formato hex: #ff0000');
        }
        banConfig.color = value;
      } else if (field === 'gif') {
        banConfig.gif = value;
      } else if (field === 'descricao') {
        banConfig.description = value;
      } else {
        return message.channel.send('❌ Campo inválido! Use: cor, gif ou descricao');
      }
      
      db.set(`embed_config_ban_${message.guild.id}`, banConfig);
      message.channel.send('✅ Configuração de ban atualizada!');
      return;
    }
    
    message.channel.send({ embeds: [embed] });
  },
});

// Welcome command aliases (must be after all commands are defined)
commands.set("sw", commands.get("setwelcome"));
commands.set("swr", commands.get("setwelcomerole"));
commands.set("sad", commands.get("setautodelete"));
commands.set("tw", commands.get("testwelcome"));
commands.set("rw", commands.get("resetwelcome"));

// Reset verification alias
commands.set("rav", commands.get("resetallverify"));

// Command aliases for new commands
commands.set("casar", commands.get("marry"));
commands.set("bioverify", commands.get("biochecker"));
commands.set("verificarbio", commands.get("biochecker")); 
commands.set("panel", commands.get("painel"));
commands.set("sinfo", commands.get("serverinfo"));
commands.set("silenciar", commands.get("mute"));
commands.set("desmutar", commands.get("unmute"));
commands.set("desbanir", commands.get("unban"));

// Marriage command
commands.set("marry", {
  run: async (client, message, args) => {
    const member = message.mentions.members.first();
    if (!member) {
      return message.channel.send("💍 Mencione alguém para casar! Exemplo: `.marry @pessoa`");
    }
    
    if (member.id === message.author.id) {
      return message.channel.send("🤔 Você não pode casar consigo mesmo!");
    }
    
    if (member.bot) {
      return message.channel.send("🤖 Você não pode casar com um bot!");
    }
    
    // Check if author is already married
    const authorMarriage = db.get(`marriage_${message.guild.id}_${message.author.id}`);
    if (authorMarriage) {
      const marriageDate = new Date(authorMarriage.date);
      const timeDiff = Date.now() - marriageDate.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return message.channel.send(
        `💕 ${message.author} já está casado(a) com <@${authorMarriage.partner}> há ${days} dias e ${hours} horas! 💖`
      );
    }
    
    // Check if target is already married
    const targetMarriage = db.get(`marriage_${message.guild.id}_${member.id}`);
    if (targetMarriage) {
      const marriageDate = new Date(targetMarriage.date);
      const timeDiff = Date.now() - marriageDate.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return message.channel.send(
        `💕 ${member} já está casado(a) com <@${targetMarriage.partner}> há ${days} dias e ${hours} horas! 💖`
      );
    }
    
    // If both are not married, proceed with marriage proposal
    // Create marriage proposal
    const acceptButton = new MessageButton()
      .setCustomId(`marry_accept_${message.author.id}_${member.id}`)
      .setLabel('💍 Aceitar')
      .setStyle('SUCCESS');
    
    const rejectButton = new MessageButton()
      .setCustomId(`marry_reject_${message.author.id}_${member.id}`)
      .setLabel('❌ Recusar')
      .setStyle('DANGER');
    
    const row = new MessageActionRow().addComponents(acceptButton, rejectButton);
    
    const embed = new MessageEmbed()
      .setTitle('💍 Pedido de Casamento!')
      .setDescription(`${message.author} está pedindo ${member} em casamento! 💕\n\n${member}, você aceita?`)
      .setColor('#ff69b4')
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed], components: [row] });
  },
});

// Server info command
commands.set("serverinfo", {
  run: async (client, message, args) => {
    const guild = message.guild;
    
    // Calculate bot's time in server
    const botMember = guild.members.cache.get(client.user.id);
    const botJoinDate = botMember ? botMember.joinedAt : null;
    let botTimeInServer = "Não disponível";
    
    if (botJoinDate) {
      const timeDiff = Date.now() - botJoinDate.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      botTimeInServer = `${days} dias e ${hours} horas`;
    }
    
    const embed = new MessageEmbed()
      .setTitle(`📊 Informações do Servidor: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addField('📅 Criado em', `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, true)
      .addField('👥 Membros', `${guild.memberCount}`, true)
      .addField('🚀 Boosts', `${guild.premiumSubscriptionCount || 0}`, true)
      .addField('🏆 Nível de Boost', `${guild.premiumTier}`, true)
      .addField('🤖 Bot no servidor há', botTimeInServer, true)
      .addField('👑 Dono', `<@${guild.ownerId}>`, true)
      .addField('🌍 Região', guild.preferredLocale || 'Não disponível', true)
      .addField('🔒 Nível de Verificação', getVerificationLevel(guild.verificationLevel), true)
      .addField('📺 Canais', `${guild.channels.cache.size}`, true)
      .setColor('#0099ff')
      .setTimestamp();
    
    if (guild.description) {
      embed.setDescription(guild.description);
    }
    
    message.channel.send({ embeds: [embed] });
  },
});

// Mute command (updated for 28 days)
commands.set("mute", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("MANAGE_ROLES")) {
      return message.channel.send("❌ Você não tem permissão para usar este comando.");
    }
    
    const member = message.mentions.members.first();
    if (!member) {
      return message.channel.send("👤 Mencione um membro para mutar. Exemplo: `.mute @membro 10m motivo`");
    }
    
    if (member.id === message.author.id) {
      return message.channel.send("🤔 Você não pode se mutar!");
    }
    
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      return message.channel.send("⚠️ Você não pode mutar alguém com cargo igual ou superior ao seu!");
    }
    
    const timeStr = args[1];
    const reason = args.slice(2).join(" ") || "Sem motivo especificado";
    
    if (!timeStr) {
      return message.channel.send("⏰ Especifique o tempo de mute. Exemplos: `10m`, `2h`, `1d`, `28d`");
    }
    
    const duration = parseDuration(timeStr);
    if (!duration || duration > 28 * 24 * 60 * 60 * 1000) {
      return message.channel.send("❌ Tempo inválido! Máximo: 28 dias. Exemplos: `10m`, `2h`, `1d`, `28d`");
    }
    
    try {
      await member.timeout(duration, reason);
      
      // Save mute to database
      const muteData = {
        userId: member.id,
        guildId: message.guild.id,
        moderator: message.author.id,
        reason: reason,
        duration: duration,
        timestamp: Date.now()
      };
      
      db.set(`mute_${message.guild.id}_${member.id}`, muteData);
      
      // Get custom embed configuration
      const muteConfig = db.get(`embed_config_mute_${message.guild.id}`) || {};
      
      const embed = new MessageEmbed()
        .setTitle('🔇 Membro Mutado')
        .setDescription(muteConfig.description || `${member} foi mutado por ${formatDuration(duration)}`)
        .addField('📝 Motivo', reason)
        .addField('👮 Moderador', message.author.toString())
        .setColor(muteConfig.color || '#ff6b6b')
        .setTimestamp();
      
      if (muteConfig.gif) {
        embed.setImage(muteConfig.gif);
      }
      
      message.channel.send({ embeds: [embed] });
      
      // Try to DM the user
      member.user.send(
        `🔇 Você foi mutado em **${message.guild.name}** por ${formatDuration(duration)}\n**Motivo:** ${reason}`
      ).catch(() => {});
      
    } catch (error) {
      console.error('Erro ao mutar membro:', error);
      message.channel.send("❌ Erro ao mutar o membro. Verifique as permissões do bot.");
    }
  },
});

// Unmute command
commands.set("unmute", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("MANAGE_ROLES")) {
      return message.channel.send("❌ Você não tem permissão para usar este comando.");
    }
    
    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) {
      return message.channel.send("👤 Mencione um membro ou forneça o ID. Exemplo: `.unmute @membro` ou `.unmute 123456789`");
    }
    
    try {
      await member.timeout(null);
      
      // Remove from database
      db.delete(`mute_${message.guild.id}_${member.id}`);
      
      // Get custom embed configuration  
      const muteConfig = db.get(`embed_config_mute_${message.guild.id}`) || {};
      
      const embed = new MessageEmbed()
        .setTitle('🔊 Membro Desmutado')
        .setDescription(muteConfig.description ? muteConfig.description.replace('mutado', 'desmutado') : `${member} foi desmutado`)
        .addField('👮 Moderador', message.author.toString())
        .setColor('#51cf66')
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      
      // Try to DM the user
      member.user.send(
        `🔊 Você foi desmutado em **${message.guild.name}**`
      ).catch(() => {});
      
    } catch (error) {
      console.error('Erro ao desmutar membro:', error);
      message.channel.send("❌ Erro ao desmutar o membro. Verifique as permissões do bot.");
    }
  },
});

// Helper functions for new features
function parseDuration(timeStr) {
  const regex = /^(\d+)([smhd])$/i;
  const match = timeStr.match(regex);
  
  if (!match) return null;
  
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return amount * multipliers[unit];
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} dia(s)`;
  if (hours > 0) return `${hours} hora(s)`;
  if (minutes > 0) return `${minutes} minuto(s)`;
  return `${seconds} segundo(s)`;
}

function getVerificationLevel(level) {
  const levels = {
    0: 'Nenhuma',
    1: 'Baixa',
    2: 'Média',
    3: 'Alta',
    4: 'Muito Alta'
  };
  return levels[level] || 'Desconhecida';
}

async function getWelcomeChannelText(guildId, client) {
  const channelId = db.get(`welcome_channel_${guildId}`);
  if (!channelId) return "Não configurado";
  const channel = client.channels.cache.get(channelId);
  return channel ? `${channel}` : "Canal não encontrado";
}

async function getWelcomeRoleText(guildId, client) {
  const roleId = db.get(`welcome_role_${guildId}`);
  if (!roleId) return "Não configurado";
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return "Servidor não encontrado";
  const role = guild.roles.cache.get(roleId);
  return role ? role.name : "Cargo não encontrado";
}

function getWelcomeDeleteText(guildId) {
  const seconds = db.get(`welcome_autodelete_${guildId}`);
  return seconds ? `${seconds} segundos` : "Desabilitado";
}

async function sendWelcomeMessage(client, member, isTest = false) {
  const guildId = member.guild.id;
  const welcomeChannelId = db.get(`welcome_channel_${guildId}`);
  
  if (!welcomeChannelId) return;
  
  const welcomeChannel = client.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) return;
  
  const embed = new MessageEmbed()
    .setTitle("🎉 Bem-vindo(a)!")
    .setDescription(
      `Olá ${member}! Seja muito bem-vindo(a) ao **${member.guild.name}**!
      
Esperamos que você se divirta aqui! 🎊`
    )
    .setColor("#00ff00")
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter(isTest ? "Esta é uma mensagem de teste" : `Membro #${member.guild.memberCount}`);

  try {
    const welcomeMsg = await welcomeChannel.send({ embeds: [embed] });
    
    // Auto-delete if configured
    const autoDeleteSeconds = db.get(`welcome_autodelete_${guildId}`);
    if (autoDeleteSeconds && autoDeleteSeconds > 0) {
      setTimeout(() => {
        welcomeMsg.delete().catch(() => {});
      }, autoDeleteSeconds * 1000);
    }
    
    // Add welcome role if configured
    const welcomeRoleId = db.get(`welcome_role_${guildId}`);
    if (welcomeRoleId && !isTest) {
      const welcomeRole = member.guild.roles.cache.get(welcomeRoleId);
      if (welcomeRole) {
        await member.roles.add(welcomeRole).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem de boas-vindas:", error);
  }
}

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId.startsWith('bio_verify_')) {
    const guildId = interaction.customId.split('_')[2];
    const config = db.get(`biochecker_${guildId}`);
    
    if (!config) {
      return interaction.reply({
        content: '❌ Sistema de bio checker não configurado.',
        ephemeral: true
      });
    }
    
    // Create verification request for moderators
    const approveButton = new MessageButton()
      .setCustomId(`bio_approve_${guildId}_${interaction.user.id}`)
      .setLabel('✅ Aprovar')
      .setStyle('SUCCESS');
    
    const denyButton = new MessageButton()
      .setCustomId(`bio_deny_${guildId}_${interaction.user.id}`)
      .setLabel('❌ Negar')
      .setStyle('DANGER');
    
    const row = new MessageActionRow().addComponents(approveButton, denyButton);
    
    const embed = new MessageEmbed()
      .setTitle('🔍 Solicitação de Verificação de Bio')
      .setDescription(`**Usuário:** ${interaction.user}\n**Link necessário:** ${config.requiredLink}\n**Cargo:** <@&${config.roleId}>\n\n**Moderadores:** Verifiquem se o usuário possui o link na bio e cliquem em aprovar ou negar.`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setColor('#f39c12')
      .setTimestamp();
    
    // Send to the configured channel
    const channel = client.channels.cache.get(config.channelId);
    if (channel) {
      await channel.send({ embeds: [embed], components: [row] });
    }
    
    return interaction.reply({
      content: '✅ Sua solicitação de verificação foi enviada para os moderadores!',
      ephemeral: true
    });
  }
  
  if (interaction.customId.startsWith('bio_approve_') || interaction.customId.startsWith('bio_deny_')) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({
        content: '❌ Apenas administradores podem aprovar/negar verificações.',
        ephemeral: true
      });
    }
    
    const [action, type, guildId, userId] = interaction.customId.split('_');
    const config = db.get(`biochecker_${guildId}`);
    
    if (!config) {
      return interaction.reply({
        content: '❌ Sistema não configurado.',
        ephemeral: true
      });
    }
    
    const member = interaction.guild.members.cache.get(userId);
    if (!member) {
      return interaction.reply({
        content: '❌ Membro não encontrado.',
        ephemeral: true
      });
    }
    
    const role = interaction.guild.roles.cache.get(config.roleId);
    if (!role) {
      return interaction.reply({
        content: '❌ Cargo não encontrado.',
        ephemeral: true
      });
    }
    
    if (type === 'approve') {
      await member.roles.add(role);
      
      const embed = new MessageEmbed()
        .setTitle('✅ Verificação Aprovada')
        .setDescription(`${member} foi aprovado por ${interaction.user} e recebeu o cargo ${role.name}!`)
        .setColor('#51cf66')
        .setTimestamp();
      
      await interaction.update({ embeds: [embed], components: [] });
      
      member.user.send(`✅ Sua verificação de bio foi aprovada em **${interaction.guild.name}**! Você recebeu o cargo **${role.name}**.`).catch(() => {});
    } else {
      const embed = new MessageEmbed()
        .setTitle('❌ Verificação Negada')
        .setDescription(`A verificação de ${member} foi negada por ${interaction.user}.`)
        .setColor('#ff6b6b')
        .setTimestamp();
      
      await interaction.update({ embeds: [embed], components: [] });
      
      member.user.send(`❌ Sua verificação de bio foi negada em **${interaction.guild.name}**.`).catch(() => {});
    }
    
    return;
  }
  
  if (interaction.customId.startsWith('marry_')) {
    const [action, type, proposerId, targetId] = interaction.customId.split('_');
    
    if (interaction.user.id !== targetId) {
      return interaction.reply({
        content: '❌ Apenas a pessoa mencionada pode responder a este pedido!',
        ephemeral: true
      });
    }
    
    if (type === 'accept') {
      // Create marriage
      const marriageData = {
        partner: proposerId,
        date: new Date().toISOString(),
        guild: interaction.guild.id
      };
      
      // Save for both users
      db.set(`marriage_${interaction.guild.id}_${proposerId}`, {
        ...marriageData,
        partner: targetId
      });
      db.set(`marriage_${interaction.guild.id}_${targetId}`, marriageData);
      
      const embed = new MessageEmbed()
        .setTitle('💕 Casamento Realizado!')
        .setDescription(`<@${proposerId}> e <@${targetId}> agora estão casados! 💍\n\nQue sejam muito felizes juntos! 🎉`)
        .setColor('#ff69b4')
        .setTimestamp();
      
      await interaction.update({ embeds: [embed], components: [] });
      
    } else if (type === 'reject') {
      const embed = new MessageEmbed()
        .setTitle('💔 Pedido Rejeitado')
        .setDescription(`<@${targetId}> rejeitou o pedido de casamento de <@${proposerId}>... 😢`)
        .setColor('#ff6b6b')
        .setTimestamp();
      
      await interaction.update({ embeds: [embed], components: [] });
    }
  }
});

// Message handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Auto-delete in verification channel
  const channel = db.get(`verify_${message.guild.id}`);
  if (channel && message.channel.id === channel) {
    if (!message.content.startsWith(config.prefix)) {
      message.delete().catch(() => {});
      return;
    }
  }

  if (!message.content.startsWith(config.prefix)) {
    // Anti-raid checking for non-command messages
    const raidConfig = db.get(`antiraid_${message.guild.id}`);
    if (raidConfig && raidConfig.enabled) {
      const userId = message.author.id;
      const now = Date.now();
      
      if (!messageTracker.has(userId)) {
        messageTracker.set(userId, []);
      }
      
      const userMessages = messageTracker.get(userId);
      userMessages.push(now);
      
      // Remove old messages outside time window
      const cutoff = now - raidConfig.timeWindow;
      const recentMessages = userMessages.filter(timestamp => timestamp > cutoff);
      messageTracker.set(userId, recentMessages);
      
      // Check if user exceeds rate limit
      if (recentMessages.length > raidConfig.maxMessages) {
        try {
          await message.delete();
          const member = message.guild.members.cache.get(userId);
          if (member && !member.permissions.has('MANAGE_MESSAGES')) {
            await member.timeout(60000, 'Anti-raid: Muitas mensagens enviadas rapidamente');
            
            const embed = new MessageEmbed()
              .setTitle('🛡️ Anti-Raid Ativado')
              .setDescription(`${member} foi mutado por 1 minuto por enviar muitas mensagens rapidamente.`)
              .setColor('#e74c3c')
              .setTimestamp();
            
            message.channel.send({ embeds: [embed] }).then(msg => {
              setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
          }
        } catch (error) {
          console.error('Erro no anti-raid:', error);
        }
      }
    }
    return;
  }

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const cmd = args.shift().toLowerCase();

  if (cmd.length === 0) return;

  const command = commands.get(cmd);
  if (command) {
    try {
      command.run(client, message, args);
    } catch (error) {
      console.error("Command error:", error);
      message.channel.send("Ocorreu um erro ao executar o comando.");
    }
  }
});

// Guild member add event (welcome system)
client.on("guildMemberAdd", async (member) => {
  await sendWelcomeMessage(client, member);
});

// Ready event
client.on("ready", async () => {
  client.user.setStatus("dnd");
  console.log(`To logado em ${client.user.tag}`);
  console.log(`Loaded ${commands.size} commands`);
  
  // Resume active mutes after restart
  console.log('Verificando mutes ativos...');
  try {
    const guilds = client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      // Check for active mutes in database
      const keys = Object.keys(JSON.parse(require('fs').readFileSync('./database.json', 'utf8') || '{}'))
        .filter(key => key.startsWith(`mute_${guildId}_`));
      
      for (const key of keys) {
        const muteData = db.get(key);
        if (muteData) {
          const timeLeft = (muteData.timestamp + muteData.duration) - Date.now();
          const member = guild.members.cache.get(muteData.userId);
          
          if (timeLeft > 0 && member) {
            // Re-apply timeout for remaining time
            await member.timeout(timeLeft, 'Restaurando mute após reinicialização').catch(() => {});
            console.log(`Mute restaurado para ${member.user.tag} por ${Math.floor(timeLeft/1000)}s`);
          } else {
            // Mute expired, remove from database
            db.delete(key);
            if (member) {
              await member.timeout(null).catch(() => {});
              console.log(`Mute expirado removido para ${member.user.tag}`);
            }
          }
        }
      }
    }
    console.log('Verificação de mutes concluída.');
  } catch (error) {
    console.error('Erro ao verificar mutes:', error);
  }
});

// Error handling
client.on("error", console.error);
process.on("unhandledRejection", console.error);

// Keep alive server
require("http")
  .createServer((req, res) =>
    res.end(`
 |-----------------------------------------|
 |              Informations               |
 |-----------------------------------------|
 |• Alive: 24/7                            |
 |-----------------------------------------|
 |• Author: lirolegal                      |
 |-----------------------------------------|
 |• Server: https://discord.gg/sintase     |
 |-----------------------------------------|
 |• Github: https://github.com/liroburro   |
 |-----------------------------------------|
 |• License: Apache License 2.0            |
 |-----------------------------------------|
`),
  )
  .listen(5000);

// Login
client.login(process.env.TOKEN);





