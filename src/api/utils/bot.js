const AL_ID = process.env.TGADMIN;
const GR_ID = process.env.TGGROUP;
const testUser = process.env.TG_TESTUSER;

class BotHelper {
  constructor(bot) {
    this.bot = bot;
  }

  botMes(chatId, text, mark = true) {
    let opts = {};
    if (parseInt(chatId, 10) < 0 && mark) {
      opts = { parseMode: 'Markdown' };
    }
    // console.log(text);
    return this.bot.sendMessage(chatId, text, opts)
      .catch(e => console.log(e, chatId, text));
  }

  sendAdminTxt(text) {
    return this.botMes(AL_ID, `${text}`);
  }

  sendAdmin(text) {
    this.botMes(AL_ID, `service: ${text}`);
  }

  sendToUser(text, uid, mark = true) {
    return this.botMes(uid || AL_ID, text, mark);
  }

  sendToGroup(text, group = '') {
    let grId = GR_ID;
    if (`${group}`.length > 2) {
      grId = group;
    }
    this.botMes(grId, text);
  }

  setHomeKb(kb) {
    this.homekb = kb;
  }

  sendResponse(req) {
    const { test } = req.query;
    let { msg, group } = req.query;

    msg = msg || req.body;

    if (typeof msg === 'object' && msg.msg) {
      group = msg.group || msg;
    } else {
      msg = JSON.stringify(msg);
    }

    if (group) {
      return this.sendToGroup(msg, group);
    }

    if (test && testUser) {
      return this.sendToUser(msg, testUser);
    }

    return this.sendToUser(msg);
  }
}

module.exports = BotHelper;
