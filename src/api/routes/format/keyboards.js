const BUTTONS = require('../../../config/buttons');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');

function start() {
  const replyMarkup = Markup.keyboard([
    [BUTTONS.hello.label],
    [BUTTONS.hide.label],
  ]);
  return Extra.markup(replyMarkup);
}

function hide() {
  const replyMarkup = Markup.removeKeyboard();
  return Extra.markup(replyMarkup);
}

module.exports.hide = hide;
module.exports.start = start;
