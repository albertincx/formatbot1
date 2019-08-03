const request = require('request');

const messages = require('../../messages/habr');
const keyboards = require('./keyboards');

const addShrtLnkStatus = {};

module.exports = (bot, botHelper) => {
  bot.on(
    ['/start', '/help'],
    msg => bot.sendMessage(msg.from.id, messages.start(), keyboards.start(bot))
      .then(() => botHelper.sendAdmin(JSON.stringify(msg.from))),
  );

  // Hide keyboard
  bot.on('/hide', msg => bot.sendMessage(
    msg.from.id,
    'Type /help to show.',
    { replyMarkup: 'hide' },
  ));

  // Hide keyboard
  bot.on('/addshort', msg => bot.sendMessage(msg.from.id, messages.sendMe())
    .then(() => {
      addShrtLnkStatus[msg.from.id] = 1;
      return botHelper.sendAdmin(`link: ${msg.text}`);
    }));

  function isLinkedText(text) {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;

    return text.match(urlRegex);
  }

  bot.on('*', async (msg) => {
    let txt = msg.text;

    if (msg.caption) {
      txt = msg.caption;
    }
    if (msg && txt) {
      const isLinked = isLinkedText(txt);

      if (addShrtLnkStatus[msg.from.id] === 1) {
        const mess = isLinked ? '' : 'Canceled, link not found';

        return bot.sendMessage(msg.from.id, mess || messages.thx())
          .then(() => {
            delete addShrtLnkStatus[msg.from.id];
            return botHelper.sendAdmin(`link: ${txt}`);
          });
      }
      try {
        const links = txt.match(/http:\/\/amp(.*?)(\n|$)/gi) || [];
        const group = process.env.TGGROUP;

        links.map((link) => {
          const changedLink = link.trim();
          const newRequest = request(changedLink);
          // const headers = {};

          return newRequest.on('response', (response) => {
            // headers = response.headers;
            newRequest.abort();

            return botHelper.sendToUser(
              `${response.request.uri.href} `,
              group,
              false,
            )
              .then(message => bot.forwardMessage(
                msg.chat.id,
                group,
                message.message_id,
              ))
              .catch(error => console.log(error));
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
};
