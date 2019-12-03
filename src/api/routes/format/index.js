const url = require('url');
const messages = require('../../../messages/format');
const keyboards = require('./keyboards');

const logger = require('../../utils/logger');
const ivMaker = require('../../utils/ivMaker');
const puppet = require('../../utils/puppet');

const rabbitmq = require('../../../service/rabbitmq');
rabbitmq.createChannel();

const getLinkFromEntity = (entities, txt) => {
  let link = '';
  for (let i = 0; i < entities.length; i += 1) {
    if (entities[i].url) {
      link = entities[i].url;
      break;
    }
    if (entities[i].type === 'url') {
      let checkFf = txt.substr(0, entities[i].length + 1).match(/\[(.*?)\]/);
      if (!checkFf) {
        link = txt.substr(entities[i].offset, entities[i].length);
        break;
      }
    }
  }
  return link;
};

function getAllLinks(text) {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
  return text.match(urlRegex) || [];
}

let start = process.hrtime();
let availableOne = true;
let start2 = process.hrtime();
const elapsedSec = () => process.hrtime(start)[0];
const elapsedTime = (note = '', reset = true) => {
  let elapsed = process.hrtime(start)[1] / 1000000;
  elapsed = `${process.hrtime(start)[0]}s, ${elapsed.toFixed(0)}`;
  if (reset) start = process.hrtime(); // reset the timer
  return `${elapsed}ms ${note}`;
};
const elapsedTime2 = (note = '', reset = true) => {
  let elapsed = process.hrtime(start2)[1] / 1000000;
  elapsed = `${process.hrtime(start2)[0]}s, ${elapsed.toFixed(0)}`;
  if (reset) start2 = process.hrtime(); // reset the timer
  return `${elapsed}ms ${note}`;
};
const group = process.env.TGGROUP;
const startOrHelp = ({ message, reply }, botHelper) => {
  let system = JSON.stringify(message.from);
  try {
    reply(messages.start(), keyboards.start());
  } catch (e) {
    system = `${e}${system}`;
  }
  botHelper.sendAdmin(system);
};

module.exports = (bot, botHelper) => {
  bot.command(['/start', '/help'], ctx => startOrHelp(ctx, botHelper));
  bot.hears('👋 Help', ctx => startOrHelp(ctx, botHelper));
  bot.hears('⌨️ Hide keyboard', ({ reply }) => {
    reply('Type /help to show.', keyboards.hide()).
        catch(e => botHelper.sendError(e));
  });

  bot.action(/.*/, async (ctx) => {
    const [data] = ctx.match;
    const resolveDataMatch = data.match(/^r_([0-9]+)_([0-9]+)/);
    if (resolveDataMatch) {
      let [, msgId, userId] = resolveDataMatch;
      const extra = { reply_to_message_id: msgId };
      try {
        await bot.telegram.sendMessage(userId, messages.resolved(), extra);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  });

  const addToQueue = async ({ message: msg, reply }) => {
    logger(msg);
    let { reply_to_message, entities, caption_entities } = msg;
    if (reply_to_message) return;
    const { chat: { id: chatId }, caption } = msg;
    let { text } = msg;
    if (caption) {
      text = caption;
      if (caption_entities) entities = caption_entities;
    }
    if (msg && text) {
      let [link = ''] = getAllLinks(text);
      try {
        if (!link && entities) link = getLinkFromEntity(entities, text);
        if (!link) return;
        const parsed = url.parse(link);
        if (link.match(/^(https?:\/\/)?(www.)?google/)) {
          const l = link.match(/url=(.*?)($|&)/);
          if (l && l[1]) link = decodeURIComponent(l[1]);
        }
        if (link.match(/^(https?:\/\/)?(graph.org|telegra.ph)/)) {
          reply(messages.showIvMessage('', link, link),
              { parse_mode: 'Markdown' });
          return;
        }
        if (!parsed.pathname) return;
        const res = await reply('Waiting for instantView...') || {};
        if (!res.message_id) throw new Error('blocked');
        const rabbitMes = {
          message_id: res.message_id,
          chatId,
          link,
        };
        const el = elapsedTime('test', false);
        let queue;
        if (!availableOne && elapsedSec() > 15) {
          queue = rabbitmq.getSecond();
        }
        logger(el);
        await rabbitmq.addToQueue(rabbitMes, queue);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  };
  bot.hears(/.*/, (ctx) => addToQueue(ctx));
  bot.on('message', ({ update, reply }) => addToQueue({
    ...update,
    reply,
  }));

  let browserWs = null;
  if (botHelper.config.puppeteer) {
    puppet.getBrowser().then(ws => {
      browserWs = ws;
    });
  }
  const jobMessage = async (task) => {
    const { chatId, message_id: messageId, link, q } = task;
    let error = '';
    let isBroken = false;
    let resolveMsgId = false;
    try {
      let RESULT = '';
      try {
        logger(`queue job ${q}`);
        if (!q) {
          elapsedTime();
          availableOne = false;
          // await new Promise(resolve => setTimeout(() => resolve(), 120000));
        } else {
          elapsedTime2();
        }
        const isText = await ivMaker.isText(link);
        if (!isText) {
          RESULT = messages.isLooksLikeFile(link);
        } else {
          const source = `${link}`;
          const linkData = await ivMaker.makeIvLink(link, browserWs, q);
          const { iv, isLong, pages = '', push = '' } = linkData;
          const longStr = isLong ? `Long ${pages}/${push}` : '';
          RESULT = messages.showIvMessage(longStr, iv, source);
        }
      } catch (e) {
        logger(e);
        isBroken = true;
        RESULT = messages.broken(link);
        error = `broken ${link} ${e}`;
      }
      let t;
      if (!q) {
        t = elapsedTime();
        availableOne = true;
      } else {
        t = elapsedTime2();
      }
      const extra = { parse_mode: 'Markdown' };
      const responseMsg = await bot.telegram.editMessageText(chatId, messageId,
          null, RESULT, extra);
      if (responseMsg) {
        const { message_id: reportMessageId } = responseMsg;
        resolveMsgId = reportMessageId;
        // await bot.telegram.editMessageText(chatId, messageId, null, `${RESULT}\n\n/report${reportMessageId}`, extra);
      }
      if (!error) {
        botHelper.sendAdminMark(`${RESULT}${q ? ` from ${q}` : ''}\n${t}`,
            group);
      }
    } catch (e) {
      logger(e);
      error = `${link} error: ${JSON.stringify(
          e)} ${e.toString()} ${chatId} ${messageId}`;
    }
    logger(error);
    if (error) {
      if (isBroken && resolveMsgId) {
        botHelper.sendAdminOpts(error,
            keyboards.resolvedBtn(resolveMsgId, chatId));
      } else {
        botHelper.sendAdmin(error);
      }
    }
  };

  try {
    setTimeout(() => {
      rabbitmq.run(jobMessage);
      rabbitmq.runSecond(jobMessage);
    }, 5000);
  } catch (e) {
    botHelper.sendError(e);
  }
};
