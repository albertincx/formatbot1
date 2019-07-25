const AL_ID = process.env.TGADMIN;
const TGADMIN3 = process.env.TGADMIN3;
const ADM_ID = process.env.TGADMIN2;
const GR_ID = process.env.TGGROUP;
const testUser = process.env.TG_TESTUSER;

class BotHelper {
  constructor(bot) {
    this.bot = bot;
  }

  isAdmin(chatId) {
    return [AL_ID, ADM_ID, TGADMIN3].indexOf(`${chatId}`) !== -1;
  }

  botMes(chatId, text, mark = true) {
    let opts = {};
    if (parseInt(chatId) < 0 && mark) {
      opts = { parseMode: 'Markdown' };
    }
    // console.log(text);
    return this.bot.sendMessage(chatId, text, opts).
        catch(e => console.log(e, chatId, text));
  };

  sendAdminTxt(text) {
    return this.botMes(AL_ID, `${text}`);
  };

  sendAdmin(text) {
    this.botMes(AL_ID, `service: ${text}`);
  };

  sendToUser(text, uid, mark = true) {
    return this.botMes(uid || AL_ID, text, mark);
  };

  sendToGroup(text, group = '') {
    let grId = GR_ID;
    if (`${group}`.length > 2) {
      grId = group;
    }
    this.botMes(grId, text);
  };

  setHomeKb(kb) {
    this.homekb = kb;
  }

  sendResponse(req) {
    let { msg, group, test } = req.query;
    msg = msg || req.body;
    if (typeof msg === 'object' && msg.msg) {
      if (msg.group) {
        group = msg.group;
      }
      msg = msg.msg;
    } else {
      msg = JSON.stringify(msg);
    }
    if (group) {
      return this.sendToGroup(msg, group);
    } else if (test && testUser) {
      return this.sendToUser(msg, testUser);
    } else {
      return this.sendToUser(msg);
    }
  };
}

module.exports = BotHelper;
