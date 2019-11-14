const fs = require('fs');
const TGADMIN = parseInt(process.env.TGADMIN);

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
    return chatId === TGADMIN;
  }

  botMes(chatId, text, mark = true) {
    let opts = {};
    if (mark) {
      opts = { parseMode: 'Markdown' };
    }
    return this.bot.sendMessage(chatId, text, opts)
      .catch(e => this.sendAdmin(`error: ${JSON.stringify(e)} ${chatId}${text}`));
  }

  sendAdmin(text, mark = false) {
    let opts = {};
    if (mark) {
      opts = { parseMode: 'Markdown' };
    }
    this.bot.sendMessage(TGADMIN, `service: ${text}`, opts);
  }

  sendAdminMark(text) {
    this.sendAdmin(text, true);
  }

  sendToUser(text, uid, mark = true) {
    return this.botMes(uid || TGADMIN, text, mark);
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
    return this.botMes(TGADMIN, content);
  }
}

module.exports = BotHelper;
