const fs = require('fs');

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

  bot.command('deleteall', async (ctx) => {
    if (!botHelper.isAdmin(ctx.message.chat.id)) {
      return ctx.reply('This command can only be used by bot owner');
    }
    if (ctx.chat.type === 'private') {
      return ctx.reply('This command can only be used in groups');
    }
    // Check if bot has necessary permissions
    const botMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    if (!botMember.can_delete_messages) {
      return ctx.reply('I need admin permissions to delete messages');
    }
    let limit = +ctx.message.text.replace('/deleteall ', '');
    // Start deletion process
    const result = await botHelper.deleteAllMessages(bot, ctx.chat.id, limit);

    if (result.success) {
      ctx.reply(`Deleted ${result.deletedCount} messages. ${result.errors.length} errors occurred.`);
    } else {
      ctx.reply(`Failed to delete messages: ${result.error}`);
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
