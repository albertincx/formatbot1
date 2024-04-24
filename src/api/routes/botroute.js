const fs = require('fs');

const {BotHelper} = require('../utils/bot');
const format = require('./format');
const db = require('../utils/db');
const messages = require('../../messages/format');
const {WORKER, NO_BOT, IS_DEV} = require('../../config/vars');
const {logger} = require('../utils/logger');

global.skipCount = 0;

const filepath = 'count.txt';
if (!fs.existsSync(filepath)) {
  fs.writeFileSync(filepath, '0');
}

const skipCountFile = '.test';

let skipCount;

if (fs.existsSync(skipCountFile)) {
  skipCount = +`${fs.readFileSync(skipCountFile)}`.replace('SKIP_ITEMS=', '');
}

let startCnt = parseInt(`${fs.readFileSync('count.txt')}`, 10);

let limit90Sec = 0;

const botRoute = (bot, conn) => {
  const botHelper = new BotHelper(bot.telegram, WORKER);
  if (conn) {
    conn.on('error', () => {
      botHelper.disDb();
    });
    botHelper.setConn(conn);
  } else {
    botHelper.disDb();
  }

  bot.catch(e => {
    if (limit90Sec > 5) {
      botHelper.sendError(`${e} Unhandled 90000 Restarted`);
      setTimeout(() => {
        botHelper.restartApp();
      }, 4000);
      return;
    }
    if (`${e}`.match('out after 90000 milliseconds')) {
      limit90Sec += 1;
    } else {
      botHelper.sendError(`${e} Unhandled x`);
    }
  });

  bot.command(/^config/, ({message}) => {
    if (botHelper.isAdmin(message.chat.id)) {
      botHelper.toggleConfig(message);
    }
  });

  bot.command('cconfig', ({message}) => {
    if (botHelper.isAdmin(message.chat.id)) {
      botHelper.togglecConfig(message);
    }
  });

  bot.command('showconfig', ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      let c = JSON.stringify(botHelper.config);
      c = `${c} db ${botHelper.db}`;
      try {
        ctx.reply(c);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  bot.command('stat', ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      if (!botHelper.conn) {
        return ctx.reply('db off');
      }
      db.stat().then(r => ctx.reply(r).catch(e => botHelper.sendError(e)));
    }
  });

  bot.hears(/^\/cleardb*/, async ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      const r = await db.clear(ctx.message);
      try {
        ctx.reply(r);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  bot.command('srv', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      botHelper.sendAdmin(`srv: ${JSON.stringify(message)}`);
    }
  });

  bot.command('toggleDev', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      global.isDevEnabled = !global.isDevEnabled;
      botHelper.sendAdmin(`dev is ${global.isDevEnabled}`);
    }
  });

  bot.command('skipCount', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      if (!global.skipCount) {
        global.skipCount = 5;
      }
      botHelper.sendAdmin(`skipCount is ${global.skipCount}`);
    }
  });

  bot.command('restartApp', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      botHelper.restartApp();
    }
  });

  bot.command('gitPull', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      botHelper.gitPull();
    }
  });

  bot.command('getInfo', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      botHelper.getInfo().then(info => {
        botHelper.sendAdmin(`Info:\n${JSON.stringify(info)}`);
      });
    }
  });

  bot.command('getCleanData', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      db.getCleanData().then(r => {
        botHelper.sendAdmin(`${messages.cleanCommands(r)}`);
      });
    }
  });

  process.on('unhandledRejection', reason => {
    if (`${reason}`.match('bot was blocked by the user')) {
      return;
    }
    if (`${reason}`.match(BotHelper.BANNED_ERROR)) {
      return;
    }
    botHelper.sendAdmin(`unhandledRejection: ${reason}`);
  });

  format(bot, botHelper, skipCount);

  if (!NO_BOT) {
    bot.launch().catch(e => {
      console.log('____LAUNCH ERROR');
      logger(e);
      console.log('____LAUNCH ERROR');
    });
  }

  if (startCnt % 10 === 0 || IS_DEV) {
    const lg = `started ${startCnt} times`;
    logger(lg);
    botHelper.sendAdmin(lg);
  }

  startCnt += 1;

  if (startCnt >= 500) startCnt = 0;

  fs.writeFileSync(filepath, parseInt(startCnt, 10).toString());

  botHelper.setBlacklist();

  return botHelper;
};

module.exports = botRoute;
