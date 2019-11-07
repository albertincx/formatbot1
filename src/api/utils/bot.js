const fs = require('fs');
const AL_ID = parseInt(process.env.TGADMIN);

class BotHelper {
  constructor(bot) {
    this.bot = bot;
    let c = {};
    try {
      c = JSON.parse(`${fs.readFileSync('.conf/config.json')}`);
    } catch (e) {
    }
    this.config = c;
  }

  isAdmin(chatId) {
    return chatId === AL_ID;
  }

  botMes(chatId, text, mark = true) {
    let opts = {};
<<<<<<< HEAD
    if (parseInt(chatId, 10) < 0 && mark) {
      opts = { parseMode: 'Markdown' };
    }
    return this.bot.sendMessage(chatId, text, opts)
      .catch(e => {
        console.log(e, chatId, text);
        return this.sendAdmin(JSON.stringify(e));
      });
=======
    if (mark) {
      opts = { parseMode: 'Markdown' };
    }
    return this.bot.sendMessage(chatId, text, opts)
      .catch(e => this.sendAdmin(JSON.stringify(e)));
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
  }

  sendAdmin(text) {
    this.botMes(AL_ID, `service: ${text}`);
  }

  sendToUser(text, uid, mark = true) {
    return this.botMes(uid || AL_ID, text, mark);
  }

  toggleConfig(configFile, msg) {
    if (!this.isAdmin(msg.chat.id)) {
      return Promise.resolve();
    }
    let content = '';
    if (this.config[configFile] === 'On') {
      content = 'Off';
    } else {
      content = 'On';
    }
    this.config[configFile] = content;
    fs.writeFileSync('.conf/config.json', JSON.stringify(this.config));
    return this.botMes(AL_ID, content);
  }
}

module.exports = BotHelper;
