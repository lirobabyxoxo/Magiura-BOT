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
  name: "setrrole",
  aliases: ["srr"],
  category: ":frame_photo: WELCOME",
  run: (client, message, args) => {

     if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send("You do not enough permission to use this command.");
    }
    let vrole = message.mentions.roles.first();
    if(!vrole) {
      return message.channel.send(`Give a role you want to remove when they verified.`)
    }
    

   // This code is made by Atreya#2401
    db.set(`srrole_${message.guild.id}`, vrole.id)
    
    
    message.channel.send(`Now I will remove \`${vrole}\` if they verify `)
  }
}