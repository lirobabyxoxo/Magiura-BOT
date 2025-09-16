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
  },
  delete: (key) => {
    try {
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch {}
      delete data[key];
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }
};

module.exports = {
  name: "rvchannel",
  aliases: ["rvc"],
  category: ":frame_photo: WELCOME",

  run: (client, message, args) => {
   if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send("You do not enough permission to use this command.");
    }
 
  db.delete(`verify_${message.guild.id}`);


// This code is made by Atreya#2401
    
    message.channel.send(`Removed verification Channel.`)
  }
}