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

function report() {
  return Markup.inlineKeyboard([
    Markup.button('No images', 'no_img'),
    Markup.button('No InstantViewButton', 'no_button'),
  ]);
}

function resolvedBtn(rmsgId, chatId) {
  return Markup.inlineKeyboard([
    Markup.button('Report Resolved', `r_${rmsgId}_${chatId}`),
  ]);
}

module.exports.hide = hide;
module.exports.start = start;
module.exports.report = report;
module.exports.resolvedBtn = resolvedBtn;
