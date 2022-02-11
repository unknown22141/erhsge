const Discord = require('discord.js')
module.exports.run = async (bot, message, args, gen) => {
    let embed = new Discord.MessageEmbed()
    .setTitle('Gen Commands')
    .setColor(bot.color)
    .setThumbnail('https://cdn.discordapp.com/emojis/879353213189513296.png?v=1')
    .setDescription('This Help command is for you to understand the commands of the free gen.')
    .addField('$help','Shows you a options account')
    .addField('$gen (acc type)', 'Gens you an account')
    .addField('$stock','Shows you a list of all accounts in stock')
    .addField('$repo','Shows some info about the bot!')
    .setFooter('Made by Wntd | https://cracked.to/Wntd','https://cdn.discordapp.com/emojis/879353213189513296.png?v=1')
    .setTimestamp()
       message.channel.send(embed)
       setTimeout(() => message.delete(), 10000);
    }
    
module.exports.help = {
    name: 'help',
    aliases: []
}