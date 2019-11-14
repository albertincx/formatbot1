const url = require('url');
const messages = require('../../../messages/format');
const keyboards = require('./keyboards');

const logger = require('../../utils/logger');
const ivMaker = require('../../utils/ivMaker');

const rabbit = require('../../../service/rabbit');
const rabbitmq = require('../../../service/rabbitmq');

let rchannel = null;
rabbit.start()
  .then(c => rchannel = c);

function getAllLinks(text) {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
  return text.match(urlRegex) || [];
}

const group = process.env.TGGROUP;

function showIvMessage(...args) {
  return `${args[0]} [InstantView](${args[1]}) from [Source](${args[2]})`;
}

module.exports = (bot, botHelper) => {
  bot.on(['/start', '/help'], (msg) => {
    let system = JSON.stringify(msg.from);
    try {
      bot.sendMessage(msg.from.id, messages.start(), keyboards.start(bot));
    } catch (e) {
      system = `${e}${system}`;
    }
    botHelper.sendAdmin(system);
  });

  // Hide keyboard
  bot.on('/hide', msg => bot.sendMessage(
    msg.from.id,
    'Type /help to show.',
    { replyMarkup: 'hide' },
  ));

  bot.on('*', async (msg) => {
    const { reply_to_message } = msg;
    if (reply_to_message) return;

    const { chat: { id: chatId }, caption } = msg;
    let { text } = msg;
    if (caption) text = caption;
    if (msg && text) {
      let [link = ''] = getAllLinks(text);
      if (link) {
        try {
          const parsed = url.parse(link);
          if (link.match(/^(https?:\/\/)?(graph.org|telegra.ph)/)) {
            botHelper.sendToUser(showIvMessage('', link, link), chatId);
            return;
          }
          if (link.match(/^(https?:\/\/)?(www.)?google/)) {
            const l = link.match(/url=(.*?)($|&)/);
            if (l && l[1]) link = l[1];
          }
          if (parsed.pathname.match(/\..{2,4}$/) && !parsed.pathname.match(/.(html?|js)/)) {
            botHelper.sendToUser(`It looks like a file [link](${link})`, chatId);
            return;
          }
          const res = await botHelper.sendToUser('Waiting for instantView...', chatId) || {};
          if (!res.message_id) {
            throw new Error('blocked');
          }
          const rabbitMes = {
            message_id: res.message_id,
            chatId,
            link,
          };
          if (rchannel) {
            try {
              await rchannel.sendToQueue('tasks',
                Buffer.from(JSON.stringify(rabbitMes)), {
                  contentType: 'application/json',
                  persistent: true,
                });
            } catch (e) {
              botHelper.sendAdmin(`error: ${e}`);
            }
          }
        } catch (e) {
          botHelper.sendAdmin(`error: ${e}`);
        }
      }
    }
  });

  const jobMessage = async (task) => {
    const { chatId, message_id: messageId, link } = task;
    let error = '';
    try {
      let RESULT = `Sorry, but your [link](${link}) is broken, restricted, or content is empty`;
      try {
        const { iv, source, isLong } = await ivMaker.makeIvLink(link);
        RESULT = showIvMessage(isLong ? 'Long' : '', iv, source);
      } catch (e) {
        logger(e);
        error = `broken [link](${link}) ${e}`;
      }
      const user = {
        chatId,
        messageId,
      };
      await bot.editMessageText(user, RESULT, { parseMode: 'Markdown' });
      if (!error) {
        await bot.forwardMessage(group, chatId, messageId);
      }
    } catch (e) {
      logger(e);
      error = `[link](${link}) task error: ${e} ${chatId} ${messageId}`;
    }

    if (error) {
      botHelper.sendAdminMark(error);
    }
  };

  try {
    setTimeout(() => {
      rabbitmq.start(jobMessage);
    }, 5000);
  } catch (e) {
    botHelper.sendAdmin(`error: ${e}`);
  }
};
