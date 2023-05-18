const TeleBot = require('telebot');

const BUTTONS = require('./buttons');

const bot = new TeleBot({
  token: `${process.env.TBTKNHABR}`,
  usePlugins: ['namedButtons'],
  pluginConfig: {
    namedButtons: {
      buttons: BUTTONS,
    },
  },
});
module.exports = bot;
