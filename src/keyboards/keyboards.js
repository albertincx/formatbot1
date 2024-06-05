const {Markup} = require('telegraf');
const BUTTONS = require('../config/buttons');

function start() {
  return Markup.keyboard([
    [BUTTONS.hello.label],
    [BUTTONS.hide.label],
    [BUTTONS.support.label],
  ]);
}

function hide() {
  return Markup.removeKeyboard();
}

module.exports.hide = hide;
module.exports.start = start;
