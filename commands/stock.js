const Discord = require('discord.js')
 
module.exports.run = async (bot, message, args, gen) => {
    let embed = new Discord.MessageEmbed()
     .setTitle('**Accounts In Stock**')
     .setColor(bot.color)
     .setThumbnail('https://cdn.discordapp.com/emojis/879353213189513296.png?v=1')
     .setFooter('Made By Wntd | https://cracked.to/Wntd','https://cdn.discordapp.com/emojis/879353213189513296.png?v=1')
     .setTimestamp()
     gen.calculateStock()
     setTimeout(() => {
         const stock = gen.stock
        for(const type of stock) {
            embed.addField(type[0], type[1], true)
        }
        message.channel.send(embed)
        setTimeout(() => message.delete(), 10000);
     }, 200);
     
 }
 module.exports.help = {
     name: 'stock',
     aliases: []
 }