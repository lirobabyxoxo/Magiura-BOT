const Discord = require("discord.js")
const fs = require('fs');
const path = require('path');

// Simple database replacement
const dbPath = path.join(__dirname, '../../database.json');
const db = {
  get: (key) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      return data[key] || null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch {}
      data[key] = value;
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return value;
    } catch {
      return null;
    }
  }
};

module.exports = {
  name: "accept",
  aliases: ["verify"],
  category: ":frame_photo: WELCOME",
  usage: "st <link>",
  description: "Set the img for welcome channel",
  run: async (client, message, args) => {

    let rRole = db.get(`verole_${message.guild.id}`)
    let rerole = db.get(`srrole_${message.guild.id}`)

    const chx = db.get(`verify_${message.guild.id}`);
if (!chx) {
  return message.channel.send('Verification channel is not set. Use `.setverify #channel` to set it.');
}

const chan = client.channels.cache.get(chx);
if (!chan) {
  return message.channel.send('Verification channel not found. Please contact an administrator.');
}

if (message.channel.name == chan.name) {
  if (!rRole) {
    return message.channel.send('Verification role is not set. Use `.setrole @role` to set it.');
  }

  let myRole = message.guild.roles.cache.get(rRole);
  if (!myRole) {
    return message.channel.send('Verification role not found. Please contact an administrator.');
  }

  let user = message.member;

  try {
    await user.roles.add(myRole);
    
    if (rerole) {
      let reerole = message.guild.roles.cache.get(rerole);
      if (reerole) {
        await user.roles.remove(reerole);
      }
    }

    message.author.send(`You have been verified in ${message.guild.name}`).catch(() => {
      message.channel.send(`${user}, you have been verified! (Could not send DM)`);
    });
  } catch (error) {
    message.channel.send('There was an error processing your verification. Please contact an administrator.');
  }
}
    
  }
  }