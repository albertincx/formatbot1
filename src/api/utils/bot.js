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

  sendAdmin(text, chatId = TGADMIN, mark = false) {
    let opts = {};
    if (mark) {
      opts = {
        parseMode: 'Markdown',
        webPreview: false,
      };
    }
    if (chatId === TGADMIN) {
      text = `service: ${text}`;
    }
    return this.bot.sendMessage(chatId, text, opts);
  }

  sendAdminMark(text, chatId) {
    return this.sendAdmin(text, chatId, true);
  }

  sendToUser(text, uid = TGADMIN, mark = true) {
    return this.botMes(uid, text, mark);
  }

  toggleConfig(msg) {
    const param = msg.text.replace('/config', '')
      .trim();
    if (!param || !this.isAdmin(msg.chat.id)) {
      return Promise.resolve('no param or forbidden');
    }
    let content = '';
    if (this.config[param] === 'On') {
      content = 'Off';
    } else {
      content = 'On';
    }
    this.config[param] = content;
    fs.writeFileSync('.conf/config.json', JSON.stringify(this.config));
    return this.botMes(TGADMIN, content);
  }
}

module.exports = BotHelper;
