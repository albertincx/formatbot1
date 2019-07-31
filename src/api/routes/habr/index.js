const messages = require('../../messages/habr');
const request = require('request');
module.exports = (bot, botHelper) => {
  bot.on('/hello', (msg) => msg.reply.text('Hello command!'));
  bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, messages.start()).
        then(() => botHelper.sendAdmin(JSON.stringify(msg.from)));
  });

  function isLinked(text) {
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    /*return text.replace(urlRegex, function(url) {
      return '<a href="' + url + '">' + url + '</a>';
    })*/
    return text.match(urlRegex);
  }

  bot.on('*', async msg => {
    let txt = msg.text;
    if (msg.caption) {
      txt = msg.caption;
    }
    if (msg && txt) {
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
        console.log(txt);
        if (isLinked(txt)) {
          return botHelper.sendToUser(`${txt}`,
              gr, false);
        }
      } catch (e) {
        console.log(e);
      }
    }
  });
};
