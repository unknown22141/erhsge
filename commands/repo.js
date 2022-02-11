const discord = require('discord.js'); //Define the discord.js module
const client = new discord.Client(); //Creating discord.js client (constructor)
const disbut = require('discord-buttons');
disbut(client);

module.exports.run = async (bot, message, args, gen) => {
  let button = new disbut.MessageButton()
  .setStyle('url')
  .setURL('https://cracked.to/Wntd') 
  .setLabel('Cracked.to Profile!')

    message.channel.send('Be sure to leave a like on the post you got this from!', button);
  }

module.exports.help = {
name: 'repo',
aliases: []
}
