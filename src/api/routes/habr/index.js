const messages = require('../../messages/habr');
const request = require('request');
module.exports = (bot, botHelper) => {
  bot.on('/hello', (msg) => msg.reply.text('Hello command!'));
  bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, messages.start()).
        then(() => botHelper.sendAdmin(JSON.stringify(msg.from)));
  });
  bot.on('*', async msg => {
    if (msg && msg.caption) {
      try {
        const links = msg.caption.match(/http:\/\/amp(.*?)(\n|$)/gi);
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
      } catch (e) {
        console.log(e);
      }
    }
  });
};
