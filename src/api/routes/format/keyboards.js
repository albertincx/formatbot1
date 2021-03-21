const {Markup} = require('telegraf');
const BUTTONS = require('../../../config/buttons');

function start() {
  const replyMarkup = Markup.keyboard([
    [BUTTONS.hello.label],
    [BUTTONS.hide.label],
    [BUTTONS.support.label],
  ]);
  return replyMarkup;
}

function hide() {
  return Markup.removeKeyboard();
}

function report() {
  const replyMarkup = Markup.inlineKeyboard([
    Markup.button('No images', 'no_img'),
    Markup.button('No InstantViewButton', 'no_button'),
  ]);
  return replyMarkup;
}

function resolvedBtn(rmsgId, chatId) {
  const replyMarkup = Markup.inlineKeyboard([
    Markup.button('Report Resolved', `r_${rmsgId}_${chatId}`),
  ]);
  return replyMarkup;
}

module.exports.hide = hide;
module.exports.start = start;
module.exports.report = report;
module.exports.resolvedBtn = resolvedBtn;
