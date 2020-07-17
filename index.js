// Variables:
const discord = require(`discord.js`)
const fs = require(`fs`)
let settings = require(`./settings.json`)

// Setting up the Bot:
const client = new discord.Client()

client.login(settings.token)

client.on(`ready`, async =>{
  settings = reload(`./settings.json`)
  console.log(`Discord bot logged in as: ${client.user.tag}`)
  if(settings.botstatusmessage && settings.botstatusmessage !== "none"){
    client.user.setActivity(settings.botstatusmessage)
  }

  // Check for Alerts:
  setInterval(() => {
    settings = reload(`./settings.json`)
    let array = settings.currentalerts
    for (let i = 0; i < array.length; i++) {
        if(Date.now() >= array[i].time){
            let channel = client.channels.cache.get(settings.alertchannelid)
            let em = emb(settings.color, `⚠️ ALERT! ⚠️`, array[i].do)
            setTimeout(() => {
              channel.send(em)
            }, 200);
            if(settings.tagonalert == "true"){
                channel.send(`<@&${settings.alertroleid}>`)
            }
            if(settings.dmonalert == "true") {
              const members = client.guilds.resolve(settings.serverid).roles.resolve(settings.alertroleid).members.map(m=>m.user)
              // console.dir(members.length)
              for(let l = 0; l < members.length; l++){
                console.log(members[l])
                members[l].send(em)
              }
            }
            settings.currentalerts = settings.currentalerts.filter(l => l.time !== array[i].time)
            fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
        }
    }
  }, 30000); // Checks every 30 seconds

})

// Commands:
client.on(`message`, (message) => {
  try{
    settings = reload(`./settings.json`)

    // Check to see if it should respond:
    if(!message.guild) return; // Don't reply to DMs.
    if (message.guild.id !== settings.serverid || message.author.bot || message.content.slice(1) == null || !message.content.startsWith(settings.prefix)) return

    // More variables:
    const args = argsf(message);
    const command = args.shift().toLowerCase();
    let prefix = settings.prefix

    // Command Handler
    if (command == "help") {
      message.delete()
      if (!message.member.roles.cache.has(settings.adminroleid)) return message.channel.send(`No permission.`)
      let em = emb(settings.color, "Commmands", `${prefix}help - This command, shows all available commands.\n${prefix}settings - Show/change settings.\n${prefix}listalerts - See upcoming alerts.\n${prefix}addalert - Add an alert.`)
      message.channel.send(em)
    }

    if (command == "settings") {
      message.delete()
      if (!message.member.roles.cache.has(settings.adminroleid)) return message.channel.send(`No permission.`)
      switch (args[0]) {
        case ("set"):
          switch (args[1]) {
            case ("prefix"):
              if (!args[2]) return message.channel.send(`No prefix given!`)
              settings.prefix = args.slice(2).join(" ")
              fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
              message.channel.send(`Done!`)
              break;
            case ("color"):
              if (!args[2]) return message.channel.send(`No color given!`)
              settings.color = args[2]
              fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
              message.channel.send(`Done!`)
              break;
            case ("tagonalert"):
              if (!args[2]) return message.channel.send(`No true/false given!`)
              if (args[2] !== "true" && args[2] !== "false") return message.channel.send(`No true/false given!`)
              settings.tagonalert = args[2]
              fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
              message.channel.send(`Done!`)
              break;
            case ("dmonalert"):
              if (!args[2]) return message.channel.send(`No true/false given!`)
              if (args[2] !== "true" && args[2] !== "false") return message.channel.send(`No true/false given!`)
              settings.dmonalert = args[2]
              fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
              message.channel.send(`Done!`)
              break;
            case ("alertroleid"):
              if (!args[2]) return message.channel.send(`No role id given!`)
              if (!client.roles.resolve(args[2])) return message.channel.send(`Invalid ID.`)
              settings.alertroleid = args[2]
              fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
              message.channel.send(`Done!`)
              break;
            case ("alertchannelid"):
              if (!args[2]) return message.channel.send(`No channel id given!`)
              if (!client.channels.resolve(args[2])) return message.channel.send(`Invalid ID.`)
              settings.alertchannelid = args[2]
              fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));
              message.channel.send(`Done!`)
              break;
            default:
              message.channel.send(`Invalid thing to set. Format: \`${prefix}settings set <prefix / color / tagonalert / dmonalert / alertroleid / alertchannelid>\``)
              break;
          }
          break;
        default:
          let em = emb(settings.color, 'Settings', `**Prefix:** ${prefix}\n**Color:** ${settings.color}\nTag on Alert? ${settings.tagonalert}\nDM on Alert? ${settings.dmonalert}\nAlert Role: <@&${settings.alertroleid}>\nAlert Channel: <#${settings.alertchannelid}>`)
          message.channel.send(em)
          break;
      }
    }

    if (command == "listalerts") {
      message.delete()
      let array = settings.currentalerts
      let current = []
      for (let i = 0; i < array.length; i++) {
        current.push(`**__${array[i].title}:__**\n` + `**Times:**\n` + dates(array[i].time) + `\n` + `**ALERT MESSAGE:**\n` + array[i].do);
      }
      let em = emb(settings.color, 'Alerts', `**__Current Alerts:__**\n\n${current.join("\n\n")}`)
      message.channel.send(em)
    }

    if (command == "addalert") {
      message.delete()
      if (!args[1]) return message.channel.send(`Invalid. Format: \`${prefix}addalert <4d2h3m/2h3m/30m> <Title> <message>\``)
      let days = 0, hours = 0, minutes = 0;
      let arra = args[0].split(/(\d+)/)
      for(let i = 0; i < arra.length; i++){
        if(arra[i] == "d"){ days = parseInt(arra[arra.indexOf("d")-1]) }
        if(arra[i] == "h"){ hours = parseInt(arra[arra.indexOf("h")-1]) }
        if(arra[i] == "m"){ minutes = parseInt(arra[arra.indexOf("m")-1]) }
      }
      if(minutes == null || isNaN(minutes) || hours == null || isNaN(hours) || days == null || isNaN(days)) return message.channel.send(`Something is wrong in the time code you send. (Format: \`${prefix}addalert <4d2h3m/2h3m/30m> <Title> <message>\`)`)
      let time = (parseInt(days) * 86400000 + parseInt(hours) * 3600000 + parseInt(minutes) * 60000)

      settings.currentalerts.push({
        time: Date.now() + time,
        title: args[1],
        do: args.slice(2).join(" ")
      })
      fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));

      settings = reload(`./settings.json`)
      let array = settings.currentalerts
      let current = []
      for (let i = 0; i < array.length; i++) {
        current.push(`**__${array[i].title}:__**\n` + `**Times:**\n` + dates(array[i].time) + `\n` + `**ALERT MESSAGE:**\n` + array[i].do);
      }

      let em = emb(settings.color, 'Alerts', `**__Current Alerts:__**\n\n${current.join("\n\n")}`)
      message.channel.send(em)
    }

    if (command == "removealert") {
      message.delete()
      if (!args[0]) return message.channel.send(`Invalid! Format: \`${prefix}removealert <Title>\``)

      settings.currentalerts = settings.currentalerts.filter(i => i.title.toLowerCase() !== args[0].toLowerCase())
      fs.writeFileSync(`./settings.json`, JSON.stringify(settings, null, 2));

      settings = reload(`./settings.json`)
      let array = settings.currentalerts
      let current = []
      for (let i = 0; i < array.length; i++) {
        current.push(`**__${array[i].title}:__**\n` + `**Times:**\n` + dates(array[i].time) + `\n` + `**ALERT MESSAGE:**\n` + array[i].do);
      }

      let em = emb(settings.color, 'Alerts', `**__Current Alerts:__**\n\n${current.join("\n\n")}`)
      message.channel.send(em)
    }
  }
  catch(error){
    console.log(error)
  }
})


// Various Functions:
function argsf(message) {
  settings = reload("./settings.json")
  return message.content.slice(settings.prefix.length).split(' ');
}

function reload(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

function emb(color, author, desc) {
  return em = new discord.MessageEmbed().setColor(color).setTimestamp().setAuthor(author).setDescription(desc)
}

function dates(time){
  let date = new Date(time)
  let est = date.toLocaleTimeString(`en-us`, { timeZone: 'America/New_York', timeStyle: `short` }) + " " + date.toLocaleTimeString(`en-us`, { timeZone: 'America/New_York', dateStyle: `short` })
  let gmt = date.toLocaleTimeString(`en-us`, { timeZone: 'Etc/GMT', timeStyle: `short` }) + " " + date.toLocaleTimeString(`en-us`, { timeZone: 'Etc/GMT', dateStyle: `short` })
  let act = date.toLocaleTimeString(`en-us`, { timeZone: 'Australia/Sydney', timeStyle: `short` }) + " " + date.toLocaleTimeString(`en-us`, { timeZone: 'Australia/Sydney', dateStyle: `short` })
  return(`EST - ${est}, GMT - ${gmt}, ACST - ${act}`)
}