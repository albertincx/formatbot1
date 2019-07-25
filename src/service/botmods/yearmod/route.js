const controller = require('./controller');
const AL_ID = process.env.TGADMIN;
const GR_ID = process.env.TGGROUP;

module.exports = (bot) => {
  bot.on(['/start', '/back'], msg => {

    let replyMarkup = bot.keyboard([
      [bot.button('list', 'Участники'), '/inlineKeyboard'],
      ['/start', '/hide']
    ], { resize: true });

    return bot.sendMessage(msg.from.id, 'Keyboard example.', { replyMarkup });

  });
  bot.on('/start1', (msg) => {
    // msg.reply.text('Welcome2!');
    console.log(msg);
    let replyMarkup = bot.inlineKeyboard([
      [
        bot.inlineButton('callback', {
          callback: {
            test: `${msg.message_id}`,
            c: 2
          }
        }),
        bot.inlineButton('inline', { inline: 'some query' })
      ], [
        bot.inlineButton('url', { url: 'https://telegram.org' })
      ]
    ]);

    return bot.sendMessage(msg.from.id, 'Inline keyboard example.', { replyMarkup });
  });

// Inline button callback
  bot.on('callbackQuery', msg => {
    // User message alert

    console.log(msg, 'callbackQuery data:', msg.data, msg.id);
    bot.answerCallbackQuery(msg.id, { text: `test` });
    bot.editMessageText(
      {
        chatId: msg.from.id,
        messageId: msg.data
      }, `<b>Current time:</b> 1`,
      { parseMode: 'html' }
    )
      .catch(error => console.log('Error:', error));
  });
  const sendToAdmin = (text) => bot.sendMessage(AL_ID, text);
  const sendToGroup = (text) => bot.sendMessage(GR_ID, text);

  bot.on('/task', async (msg) => {
    let res = await controller.startExport(msg.text);
    if (!res) {
      res = 'error';
    }
    return msg.reply.text(res);
  });

  bot.on('/list', async (msg) => {
    let res = await controller.getUsers();
    if (!res) {
      res = 'error';
    }

    return sendToAdmin(res);
  });
};
