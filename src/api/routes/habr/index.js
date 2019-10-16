const request = require('request');

const messages = require('../../messages/habr');
const keyboards = require('./keyboards');

const addShrtLnkStatus = {};

function isLinkedText(text) {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;

  return text.match(urlRegex);
}

const sites = require('./sites');

module.exports = (bot, botHelper) => {
  bot.on(
      ['/start', '/help'],
      msg => bot.sendMessage(msg.from.id, messages.start(),
          keyboards.start(bot)).
          then(() => botHelper.sendAdmin(JSON.stringify(msg.from))),
  );

  // Hide keyboard
  bot.on('/hide', msg => bot.sendMessage(
      msg.from.id,
      'Type /help to show.',
      { replyMarkup: 'hide' },
  ));

  // Hide keyboard
  bot.on('/addshort',
      msg => bot.sendMessage(msg.from.id, messages.sendMe()).then(() => {
        addShrtLnkStatus[msg.from.id] = 1;
        return botHelper.sendAdmin(`link: ${msg.text}`);
      }));

  bot.on('*', async (msg) => {
    let txt = msg.text;
    const { reply_to_message } = msg;
    if (reply_to_message) return;
    if (msg.caption) {
      txt = msg.caption;
    }
    if (msg && txt) {
      const isLinked = isLinkedText(txt);

      if (addShrtLnkStatus[msg.from.id] === 1) {
        const mess = isLinked ? '' : 'Canceled, link not found';

        return bot.sendMessage(msg.from.id, mess || messages.thx()).then(() => {
          delete addShrtLnkStatus[msg.from.id];
          return botHelper.sendAdmin(`link: ${txt}`);
        });
      }
      const group = process.env.TGGROUP;

      try {
        let links = [];
        sites.map(reg => {
          const l = txt.match(reg) || [];
          links = links.concat(l);
        });

        links.map((link) => {
          const changedLink = link.trim();
          const newRequest = request(changedLink);
          return newRequest.on('response', (response) => {
            newRequest.abort();
            return botHelper.sendToUser(
                `${response.request.uri.href} `,
                group,
                false,
            ).then(message => bot.forwardMessage(
                msg.chat.id,
                group,
                message.message_id,
            )).catch(error => console.log(error));
          });
        });
        if (isLinked) {
          return botHelper.sendToUser(`${txt}`, group, false);
        }
      } catch (error) {
        console.log(error);
      }
    }
    return true;
  });

  bot.on('/sendclient', msg => {
    if (!botHelper.isAdmin(msg.chat.id)) {
      return;
    }
    const msgText = msg.text.replace('/sendclient ', '');
    const [, userId, text] = msgText.match(/([0-9]+)\s(.*?)$/);
    botHelper.botMes(userId, text);
  });
};
