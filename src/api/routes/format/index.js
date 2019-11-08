const messages = require('../../messages/format');
const keyboards = require('./keyboards');

const sites = require('./sites');
const findLink = require('../../utils/getlink');

const rabbit = require('../../../service/rabbit');
const rabbitmq = require('../../../service/rabbitmq');

const controller = require('../../controllers/iv.controller');

const addShrtLnkStatus = {};
let rchannel = null;
rabbit.start()
  .then(c => rchannel = c);

function getAllLinks(text) {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
  return text.match(urlRegex);
}

const group = process.env.TGGROUP;

module.exports = (bot, botHelper) => {
  bot.on(
    ['/start', '/help'],
    msg => bot.sendMessage(msg.from.id, messages.start(),
      keyboards.start(bot))
      .then(() => botHelper.sendAdmin(JSON.stringify(msg.from))),
  );

  // Hide keyboard
  bot.on('/hide', msg => bot.sendMessage(
    msg.from.id,
    'Type /help to show.',
    { replyMarkup: 'hide' },
  ));

  // Hide keyboard
  bot.on('/addshort',
    msg => bot.sendMessage(msg.from.id, messages.sendMe())
      .then(() => {
        addShrtLnkStatus[msg.from.id] = 1;
        return botHelper.sendAdmin(`link: ${msg.text}`);
      }));

  bot.on('*', async (msg) => {
    let { text, chat: { id: chatId } } = msg;
    const { reply_to_message } = msg;
    if (reply_to_message) return;
    if (msg.caption) {
      text = msg.caption;
    }
    if (msg && text) {
      const allLinks = getAllLinks(text);
      let firstLink = '';
      if (allLinks && allLinks.length) {
        firstLink = allLinks[0];
      }
      if (addShrtLnkStatus[msg.from.id] === 1) {
        const mess = firstLink ? '' : 'Canceled, link not found';
        bot.sendMessage(msg.from.id, mess || messages.thx())
          .then(() => {
            delete addShrtLnkStatus[msg.from.id];
            return botHelper.sendAdmin(`link: ${text}`);
          });
      } else {
        try {
          const link = await findLink(text, sites) || firstLink;
          if (link) {
            try {
              const { message_id } = await botHelper.sendToUser('Waiting for instantView...', chatId);
              const rabbitMes = {
                message_id,
                link,
                chatId,
              };
              await rchannel.sendToQueue('tasks',
                Buffer.from(JSON.stringify(rabbitMes)), {
                  contentType: 'application/json',
                  persistent: true,
                });
              botHelper.sendAdmin(`[orig](${text})`);
            } catch (e) {
              botHelper.sendAdmin(`error: ${e}`);
            }
          } else if (firstLink) {
            botHelper.sendToUser(`${text}`, group, false);
          }
        } catch (e) {
          botHelper.sendAdmin(`cantreachlink: ${e}`);
        }
      }
    }
  });

  const jobMessage = async ({ chatId, message_id: messageId, link }) => {
    let error = '';
    let RESULT = 'Sorry Your link is broken, restricted, or not found, or forbidden';
    try {
      const iVlink = await controller.makeIvLink(link);
      RESULT = `[InstantView](${iVlink}) from [Source](${link})`;
    } catch (e) {
      error = `broken [link](${link}) ${e}`;
    }
    const user = {
      chatId,
      messageId,
    };
    await bot.editMessageText(user, RESULT, { parseMode: 'Markdown' });
    if (!error) {
      await bot.forwardMessage(group, chatId, messageId);
    } else {
      botHelper.sendAdmin(error);
    }
  };

  setTimeout(() => {
    rabbitmq.start(botHelper, jobMessage);
  }, 5000);
};
