const { Client, Collection, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Database = require('./utils/database');
const interactionHandler = require('./handlers/interactionHandler');

// Initialize client and database
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.MESSAGE_CONTENT
  ]
});

const db = new Database('./database.json');
client.commands = new Collection();

// Message tracker for anti-raid
const messageTracker = new Map();

// Load commands
const commandFolders = fs.readdirSync('./commands');

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(__dirname, 'commands', folder, file);
    const command = require(filePath);
    
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name} from ${folder}/${file}`);
    } else {
      console.log(`Warning: Command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }
}

// Register slash commands
async function deployCommands() {
  const commands = [];
  client.commands.forEach(command => {
    commands.push(command.data.toJSON());
  });

  const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}

// Ready event
client.on('ready', async () => {
  client.user.setStatus('dnd');
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Loaded ${client.commands.size} slash commands`);
  
  // Deploy commands
  await deployCommands();
  
  // Resume active mutes after restart
  console.log('Checking active mutes...');
  try {
    const guilds = client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      const keys = Object.keys(db.all()).filter(key => key.startsWith(`mute_${guildId}_`));
      
      for (const key of keys) {
        const muteData = db.get(key);
        if (muteData) {
          const timeLeft = (muteData.timestamp + muteData.duration) - Date.now();
          const member = guild.members.cache.get(muteData.userId);
          
          if (timeLeft > 0 && member) {
            await member.timeout(timeLeft, 'Restoring mute after restart').catch(() => {});
            console.log(`Mute restored for ${member.user.tag} for ${Math.floor(timeLeft/1000)}s`);
            
            // Set auto-unmute
            setTimeout(async () => {
              try {
                const currentMember = guild.members.cache.get(muteData.userId);
                if (currentMember && currentMember.communicationDisabledUntil) {
                  await currentMember.timeout(null);
                  db.delete(key);
                  console.log(`Auto-unmuted ${currentMember.user.tag}`);
                }
              } catch (error) {
                console.error('Error auto-unmuting:', error);
              }
            }, timeLeft);
          } else {
            db.delete(key);
            if (member) {
              await member.timeout(null).catch(() => {});
              console.log(`Expired mute removed for ${member.user.tag}`);
            }
          }
        }
      }
    }
    console.log('Mute check completed.');
  } catch (error) {
    console.error('Error checking mutes:', error);
  }
});

// Slash command interaction handler
client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, db);
    } catch (error) {
      console.error('Error executing command:', error);
      const errorMessage = 'There was an error while executing this command!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    await interactionHandler.handleButtonInteraction(interaction, db);
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    await interactionHandler.handleModalSubmit(interaction, db);
  }

  // Handle select menu interactions
  if (interaction.isSelectMenu()) {
    await interactionHandler.handleSelectMenu(interaction, db);
  }
});

// Message handler for anti-raid
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // Anti-raid system
  const raidConfig = db.get(`antiraid_${message.guild.id}`);
  if (raidConfig && raidConfig.enabled) {
    const userId = message.author.id;
    const now = Date.now();
    
    if (!messageTracker.has(userId)) {
      messageTracker.set(userId, []);
    }
    
    const userMessages = messageTracker.get(userId);
    userMessages.push(now);
    
    // Clean old messages outside time window
    const cutoff = now - raidConfig.timeWindow;
    const recentMessages = userMessages.filter(timestamp => timestamp > cutoff);
    messageTracker.set(userId, recentMessages);
    
    // Check if user exceeds rate limit
    if (recentMessages.length > raidConfig.maxMessages) {
      try {
        await message.delete();
        const member = message.guild.members.cache.get(userId);
        if (member && !member.permissions.has('MANAGE_MESSAGES')) {
          await member.timeout(60000, 'Anti-raid: Too many messages sent quickly');
          
          const { createEmbed } = require('./utils/embeds');
          const embed = createEmbed(
            'Anti-Raid Activated',
            `${member} was muted for 1 minute for sending too many messages quickly.`
          );
          
          const warningMsg = await message.channel.send({ embeds: [embed] });
          setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        }
      } catch (error) {
        console.error('Anti-raid error:', error);
      }
    }
  }
});

// Keep-alive server for Replit
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`Bot is running! Commands loaded: ${client.commands ? client.commands.size : 0}`);
});

app.listen(5000, () => {
  console.log('Keep-alive server running on port 5000');
});

// Login
client.login(process.env.TOKEN);