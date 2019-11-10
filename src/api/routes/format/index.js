const url = require('url');

const messages = require('../../messages/format');
const keyboards = require('./keyboards');
const controller = require('../../controllers/iv.controller');

const logger = require('../../utils/logger');
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
      const [link = ''] = getAllLinks(text);
      if (link) {
        try {
          const parsed = url.parse(link);
          if (parsed.pathname.match(/\..{2,4}$/) && !parsed.pathname.match(/.html?/)) {
            botHelper.sendToUser(`It looks like a file [link](${link})`, chatId);
            return;
          }
          const { message_id } = await botHelper.sendToUser('Waiting for instantView...', chatId);
          const rabbitMes = {
            message_id,
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
      let RESULT = `Sorry Your link is broken, restricted, or not found, or forbidden
    Or Content Too big (we are working with this)`;
      try {
        const { iv, source, isLong } = await controller.makeIvLink(link);
        RESULT = `${isLong ? 'Long' : ''} [InstantView](${iv}) from [Source](${source})`;
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
