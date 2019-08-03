const messages = require('../../messages/habr');
const request = require('request');
const keyboards = require('./keyboards');

const addShrtLnkStatus = {};
module.exports = (bot, botHelper) => {
  bot.on(['/start', '/help'], (msg) => {
    return bot.sendMessage(msg.from.id, messages.start(), keyboards.start(bot)).
        then(() => botHelper.sendAdmin(JSON.stringify(msg.from)));
  });
  // Hide keyboard
  bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Type /help to show.',
        { replyMarkup: 'hide' },
    );
  });
// Hide keyboard
  bot.on('/addshort', msg => {
    return bot.sendMessage(msg.from.id, messages.sendMe()).
        then(() => {
          addShrtLnkStatus[msg.from.id] = 1;
          return botHelper.sendAdmin(`link: ${msg.text}`);
        });
  });

  function isLinkedText(text) {
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.match(urlRegex);
  }

  bot.on('*', async msg => {
    let txt = msg.text;
    if (msg.caption) {
      txt = msg.caption;
    }
    if (msg && txt) {
      let isLinked = isLinkedText(txt);
      if (addShrtLnkStatus[msg.from.id] === 1) {
        let mess = '';
        if (isLinked) {
        } else {
          mess = 'Canceled, link not found';
        }
        return bot.sendMessage(msg.from.id, mess || messages.thx()).
            then(() => {
              delete addShrtLnkStatus[msg.from.id];
              return botHelper.sendAdmin(`link: ${txt}`);
            });
      }
      try {
        const links = txt.match(/http:\/\/amp(.*?)(\n|$)/gi) || [];
        const gr = process.env.TGGROUP;
        links.map(ll => {
          let l = ll.trim();
          const r = request(l);
          let h = {};
          r.on('response', response => {
            h = response.headers;
            r.abort();
            return botHelper.sendToUser(`${response.request.uri.href} `,
                gr, false).then(m => {
              return bot.forwardMessage(msg.chat.id, gr,
                  m.message_id);
            }).catch(console.log);
          });
        });
        if (isLinked) {
          return botHelper.sendToUser(`${txt}`,
              gr, false);
        }
      } catch (e) {
        console.log(e);
      }
    }
  });
};
