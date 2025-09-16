const { MessageEmbed } = require('discord.js');

const defaultFooter = "Magiura - Todos os direitos reservados created by lirolegal";
const defaultColor = "#000000";

function createEmbed(title = null, description = null, options = {}) {
  const embed = new MessageEmbed()
    .setColor(options.color || defaultColor)
    .setFooter({ text: options.footer || defaultFooter })
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.author) embed.setAuthor(options.author);

  if (options.fields) {
    embed.addFields(
      options.fields.map(field => ({
        name: field.name,
        value: field.value,
        inline: field.inline || false
      }))
    );
  }

  return embed;
}

function createErrorEmbed(message) {
  return createEmbed("Erro", message);
}

function createSuccessEmbed(message) {
  return createEmbed("Sucesso", message);
}

module.exports = {
  createEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  defaultFooter,
  defaultColor
};