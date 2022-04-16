const fs = require('fs');
const BotHelper = require('../utils/bot');
const format = require('./format');
const db = require('../utils/db');

global.skipCount = 0;

const filepath = 'count.txt';
if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, '0');

const skipCountFile = '.test';
let skipCount;
if (fs.existsSync(skipCountFile)) {
  skipCount = +`${fs.readFileSync(skipCountFile)}`.replace('SKIP_ITEMS=', '');
}
let startCnt = parseInt(`${fs.readFileSync('count.txt')}`, 10);
const botRoute = (bot, conn) => {
  const botHelper = new BotHelper(bot.telegram);
  if (conn) {
    botHelper.disDb();
    // conn.on('error', () => {
    //   botHelper.disDb();
    // });
  } else {
    botHelper.disDb();
  }
  bot.command('config', ({message}) => {
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
      if (!botHelper.db) {
        return ctx.reply('db off');
      }
      db.stat().then(r => ctx.reply(r).catch(e => botHelper.sendError(e)));
    }
  });

  bot.command('cleardb', async ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      const r = await db.clear(ctx.message);
      try {
        ctx.reply(r);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  bot.command('cleardb2', async ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      const r = await db.clear2(ctx.message);
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
  bot.command('/toggleDev', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      global.isDevEnabled = !global.isDevEnabled;
      botHelper.sendAdmin(`dev is ${global.isDevEnabled}`);
    }
  });
  bot.command('/skipCount', ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      if (!global.skipCount) {
        global.skipCount = 5;
      }
      botHelper.sendAdmin(`skipCount is ${global.skipCount}`);
    }
  });

  format(bot, botHelper, skipCount);
  bot.launch();

  if (startCnt % 10 === 0 || process.env.DEV) {
    botHelper.sendAdmin(`started ${startCnt} times`);
  }
  startCnt += 1;
  if (startCnt >= 500) startCnt = 0;

  fs.writeFileSync(filepath, parseInt(startCnt, 10).toString());
  return {bot: botHelper};
};

module.exports = botRoute;
