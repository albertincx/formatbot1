const fs = require('fs');
const TGADMIN = parseInt(process.env.TGADMIN);
const _OFF = 'Off';
const _ON = 'On';

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
      opts = { parse_mode: 'Markdown' };
    }
    return this.bot.sendMessage(chatId, text, opts).
        catch(e => this.sendError(e, `${chatId}${text}`));
  }

  sendAdmin(text, chatId = TGADMIN, mark = false) {
    let opts = {};
    if (mark) {
      opts = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      };
    }
    if (chatId === TGADMIN) {
      text = `service: ${text}`;
    }
    return this.bot.sendMessage(chatId, text, opts);
  }

  sendAdminOpts(text, opts) {
    return this.bot.sendMessage(TGADMIN, text, opts);
  }

  sendAdminMark(text, chatId) {
    return this.sendAdmin(text, chatId, true);
  }

  getParams(hostname, chatId) {
    let params = {};
    const contentSelector = this.getConf(`${hostname}_content`);
    if (contentSelector) {
      params.content = contentSelector;
    }
    const puppetOnly = this.getConf(`${hostname}_puppet`);
    if (puppetOnly) {
      params.isPuppet = true;
    }
    const customOnly = this.getConf(`${hostname}_custom`);
    if (customOnly) {
      params.isCustom = true;
    }
    const scroll = this.getConf(`${hostname}_scroll`);
    if (scroll) {
      params.scroll = true;
    }
    if (this.isAdmin(chatId)) {
      if (this.getConf('test_puppet')) {
        params.isPuppet = true;
      }
      if (this.getConf('test_custom')) {
        params.isCustom = true;
      }
    }
    return params;
  }

  getConf(param) {
    let c = this.config[param] || '';
    if (c === _OFF) c = '';
    return c;
  }

  togglecConfig(msg) {
    let params = msg.text.replace('/cconfig', '').trim();
    if (!params || !this.isAdmin(msg.chat.id)) {
      return Promise.resolve('no param or forbidden');
    }
    let { param, content } = this.parseConfig(params);
    let c = {};
    c[param] = content;
    fs.writeFileSync(`.conf/custom/${param}.json`, JSON.stringify(c));
  }

  parseConfig(params) {
    let content = '';
    let param = '';
    let c = params.split(/\s/);
    if (c.length === 2) {
      param = c[0];
      content = c[1].replace(/~/g, ' ');
    } else {
      param = c[0];
      if (this.config[param] === _ON) {
        content = _OFF;
      } else {
        content = _ON;
      }
    }
    return { param, content };
  }

  toggleConfig(msg) {
    let params = msg.text.replace('/config', '').trim();
    if (!params || !this.isAdmin(msg.chat.id)) {
      return Promise.resolve('no param or forbidden');
    }

    let { param, content } = this.parseConfig(params);
    this.config[param] = content;
    fs.writeFileSync('.conf/config.json', JSON.stringify(this.config));
    return this.botMes(TGADMIN, content);
  }

  sendError(e, text = '') {
    e = `error: ${JSON.stringify(e)} ${e.toString()} ${text}`;
    return this.sendAdmin(e);
  }

  disDb() {
    this.db = false;
  }
}

module.exports = BotHelper;
