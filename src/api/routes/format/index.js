const messages = require('../../messages/format');
const keyboards = require('./keyboards');
<<<<<<< HEAD
const controller = require('../../controllers/iv.controller');
const addShrtLnkStatus = {};

function isLinkedText(text) {
=======

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
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
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
<<<<<<< HEAD
    let txt = msg.text;
    const { reply_to_message } = msg;
    if (reply_to_message) return;
    if (msg.caption) {
      txt = msg.caption;
    }
    if (msg && txt) {
      const linksFromText = isLinkedText(txt);
      let linkFromText = '';
      if (linksFromText && linksFromText.length) {
        linkFromText = linksFromText[0];
      }
      const tgph = botHelper.config.telegraph === 'On';
      if (addShrtLnkStatus[msg.from.id] === 1) {
        const mess = linkFromText ? '' : 'Canceled, link not found';

        bot.sendMessage(msg.from.id, mess || messages.thx())
          .then(() => {
            delete addShrtLnkStatus[msg.from.id];
            return botHelper.sendAdmin(`link: ${txt}`);
          });
      } else {
        const link = await controller.makeIvLink(txt, msg, linkFromText, tgph);
        if (link) {
          botHelper.sendToUser(
            `${link} `,
            group,
            false,
          )
            .then(message => bot.forwardMessage(
              msg.chat.id,
              group,
              message.message_id,
            ))
            .catch(error => console.log(error));
          botHelper.sendAdmin(`orig: ${txt}`);
        } else if (linkFromText) {
          botHelper.sendToUser(`${txt}`, group, false);
=======
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
        const link = await findLink(text, sites) || firstLink;
        if (link) {
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
          botHelper.sendAdmin(`orig: ${text}`);
        } else if (firstLink) {
          botHelper.sendToUser(`${text}`, group, false);
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
        }
      }
    }
  });

<<<<<<< HEAD
  bot.on('/sendclient', msg => {
    if (!botHelper.isAdmin(msg.chat.id)) {
      return;
    }
    const msgText = msg.text.replace('/sendclient ', '');
    const [, userId, text] = msgText.match(/([0-9]+)\s(.*?)$/);
    botHelper.botMes(userId, text);
  });
=======
  const jobMessage = async ({ chatId, message_id: messageId, link }) => {
    try {
      const iVlink = await controller.makeIvLink(link);
      await bot.editMessageText({
        chatId,
        messageId,
      }, `[InstantView](${iVlink}) from [Source](${link})`, { parseMode: 'Markdown' });
      await bot.forwardMessage(chatId, group, messageId);
    } catch (e) {
      return botHelper.sendAdmin(`broken link ${link} ${e}`);
    }
  };

  setTimeout(() => {
    rabbitmq.start(botHelper, jobMessage);
  }, 5000);
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
};
