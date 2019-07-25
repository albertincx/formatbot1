const TeleBot = require('telebot'); //old
const BUTTONS = require('./buttons'); //old
const bot = new TeleBot({
  token: `${process.env.TBTKNHABR}`,
  usePlugins: ['namedButtons'],
  pluginConfig: {
    namedButtons: {
      buttons: BUTTONS,
    },
  },
});
let botName = 'fotobank';
bot.botName = botName;
module.exports = bot;
