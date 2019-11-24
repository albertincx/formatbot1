const url = require('url');
const messages = require('../../../messages/format');
const keyboards = require('./keyboards');

const logger = require('../../utils/logger');
const ivMaker = require('../../utils/ivMaker');
const puppet = require('../../utils/puppet');

const rabbitmq = require('../../../service/rabbitmq');
rabbitmq.createChannel();

const getLinkFromEntity = ({ offset, length }, txt) => txt.substr(offset, length);

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
  bot.hears('⌨️ Hide keyboard', ({ reply }) => reply('Type /help to show.', keyboards.hide()));

  bot.hears(/.*/, async ({ message: msg, reply }) => {
    const { reply_to_message, entities } = msg;
    if (reply_to_message) return;
    const { chat: { id: chatId }, caption } = msg;
    let { text } = msg;
    if (caption) text = caption;
    if (msg && text) {
      let [link = ''] = getAllLinks(text);
      try {
        if (!link && entities) {
          link = entities[0].url || getLinkFromEntity(entities[0], text);
        }
        if (!link) {
          throw new Error('link not found');
        }
        const parsed = url.parse(link);
        if (link.match(/^(https?:\/\/)?(graph.org|telegra.ph)/)) {
          reply(messages.showIvMessage('', link, link), { parse_mode: 'Markdown' });
          return;
        }
        if (parsed.pathname.match(/\..{2,4}$/) && !parsed.pathname.match(/.(html?|js|php|asp)/)) {
          reply(`It looks like a file [link](${link})`, { parse_mode: 'Markdown' });
          return;
        }
        if (!link.match(/^(https?|ftp|file)/)) {
          link = `http://${link}`;
        }
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
  });

  let browserWs = null;
  if (botHelper.config.puppeteer) {
    puppet.getBrowser()
      .then(ws => {
        browserWs = ws;
      });
  }
  const jobMessage = async (task) => {
    const { chatId, message_id: messageId, link, q } = task;
    let error = '';
    try {
      let RESULT = `Sorry, but your [link](${link}) is broken, restricted, or content is empty`;
      try {
        const source = `${link}`;
        logger(`queue job ${q}`);
        if (!q) {
          elapsedTime();
          availableOne = false;
          // await new Promise(resolve => setTimeout(() => resolve(), 120000));
        } else {
          elapsedTime2();
        }
        const { iv, isLong, pages = '', push = '' } = await ivMaker.makeIvLink(link, browserWs, q);
        RESULT = messages.showIvMessage(isLong ? `Long ${pages}/${push}` : '', iv, source);
        // RESULT = 'skip';
      } catch (e) {
        logger(e);
        error = `broken [link](${link}) ${e}`;
      }
      let t;
      if (!q) {
        t = elapsedTime();
        availableOne = true;
      } else {
        t = elapsedTime2();
      }
      await bot.telegram.editMessageText(chatId, messageId, null, RESULT, { parse_mode: 'Markdown' });
      if (!error) {
        botHelper.sendAdminMark(`${RESULT}${q ? ` from ${q}` : ''}\n${t}`, group);
      }
    } catch (e) {
      logger(e);
      error = `[link](${link}) task error: ${JSON.stringify(e)} ${e.toString()} ${chatId} ${messageId}`;
    }
    logger(error);
    if (error) botHelper.sendAdminMark(error);
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
