const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  BotHelper,
  BANNED_ERROR
} = require('../utils/bot');
const format = require('./format');
const db = require('../utils/db');
const messages = require('../../messages/format');
const {
  WORKER,
  NO_BOT,
  IS_DEV
} = require('../../config/vars');
const {logger} = require('../utils/logger');

global.skipCount = 0;
global.isDevEnabled = IS_DEV;

const filepath = path.join(os.tmpdir(), 'formatbot_count.txt');
if (!fs.existsSync(filepath)) {
  fs.writeFileSync(filepath, '0');
}

const skipCountFile = '.test';

let skipCount;

if (fs.existsSync(skipCountFile)) {
  skipCount = +`${fs.readFileSync(skipCountFile)}`.replace('SKIP_ITEMS=', '');
}

let startCnt = 0;
try {
  startCnt = parseInt(fs.readFileSync(filepath, 'utf8'), 10) || 0;
} catch (e) {
  // Ignore read error
}

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

  bot.command('showconfig', ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      return ctx.reply(botHelper.showConfig());
    }
  });

  bot.command('stat', async ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      if (!botHelper.conn) {
        return ctx.reply('db off');
      }
      try {
        const res = await db.stat();
        return ctx.reply(res);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  bot.command('last10', async ctx => {
    if (botHelper.isAdmin(ctx.message.from.id)) {
      if (!botHelper.conn) {
        return botHelper.sendAdminMark('db off', ctx.message.chat.id);
      }
      try {
        const res = await db.getLastCreatedLinks();
        return botHelper.sendAdminMark(res, ctx.message.chat.id);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  bot.command('dbsize', async ctx => {
    if (botHelper.isAdmin(ctx.message.from.id)) {
      if (!botHelper.conn) {
        return botHelper.sendAdminMark('db off', ctx.message.chat.id);
      }
      try {
        const res = await db.getDbSizeStats(ctx.message.text.split('/dbsize')[1].trim());
        return botHelper.sendAdminMark(res, ctx.message.chat.id);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  bot.command(['sendall', 'broadcast'], async ctx => {
    if (botHelper.isAdmin(ctx.message.from.id)) {
      const text = ctx.message.text.replace(/^\/(sendall|broadcast)\s*/i, '').trim();
      if (!text) {
        return ctx.reply('Использование: /sendall <текст> [test]');
      }

      const isTest = text.endsWith('test');
      const broadcastText = isTest ? text.slice(0, -4).trim() : text;

      if (!broadcastText) {
        return ctx.reply('Ошибка: Пустой текст рассылки.');
      }

      ctx.reply(isTest ? 'Запуск тестовой рассылки на админа...' : 'Запуск полной рассылки по всем пользователям...');

      try {
        const res = await db.sendBroadcast(botHelper, broadcastText, isTest);
        return ctx.reply(`📢 Рассылка завершена!\nУспешно: ${res.success}\nОшибок: ${res.failed}\nВсего получателей: ${res.total}${res.isTest ? ' (Тестовый режим)' : ''}`);
      } catch (e) {
        botHelper.sendError(e);
        return ctx.reply(`Ошибка рассылки: ${e.message || e}`);
      }
    }
  });

  bot.hears(/^\/cleardb*/, async ctx => {
    if (botHelper.isAdmin(ctx.message.chat.id)) {
      const res = await db.clearFromCollection(ctx.message);
      return ctx.reply(res);
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

  bot.command('getInfo', async ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      const info = await botHelper.getInfo();
      return botHelper.sendAdmin(`Info:\n${JSON.stringify(info)}`);
    }
  });

  bot.command('getClean', async ({message}) => {
    if (botHelper.isAdmin(message.from.id)) {
      const data = await db.getCleanData(message.text);

      return botHelper.sendAdmin(messages.cleanCommands(data));
    }
  });

  process.on('unhandledRejection', reason => {
    logger('unhandledRejection');
    if (`${reason}`.match('bot was blocked by the user')) {
      // return;
      botHelper.sendAdmin(`unhandledRejection blocked ${reason}`);
    }
    if (`${reason}`.match(BANNED_ERROR)) {
      botHelper.sendAdmin(`unhandledRejection banned ${reason}`);
    }
    botHelper.sendAdmin(`unhandledRejection: ${reason}`);
  });

  format(bot, botHelper, skipCount);

  if (!NO_BOT) {
    bot.launch();
  }

  if (startCnt % 10 === 0 || IS_DEV) {
    const lg = `started ${startCnt} times`;
    logger(lg);
    botHelper.sendAdmin(lg);
  }

  startCnt += 1;

  if (startCnt >= 500) startCnt = 0;

  fs.writeFileSync(filepath, `${startCnt}`);

  botHelper.setBlacklist();

  return botHelper;
};

module.exports = botRoute;
