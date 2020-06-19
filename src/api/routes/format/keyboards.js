const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const BUTTONS = require('../../../config/buttons');

function start() {
  const replyMarkup = Markup.keyboard([
    [BUTTONS.hello.label],
    [BUTTONS.hide.label],
    [BUTTONS.support.label],
  ]);
  return Extra.markup(replyMarkup);
}

function hide() {
  const replyMarkup = Markup.removeKeyboard();
  return Extra.markup(replyMarkup);
}

function report() {
  const replyMarkup = Markup.inlineKeyboard([
    Markup.callbackButton('No images', 'no_img'),
    Markup.callbackButton('No InstantViewButton', 'no_button'),
  ]);
  return Extra.markup(replyMarkup);
}

function resolvedBtn(rmsgId, chatId) {
  const replyMarkup = Markup.inlineKeyboard([
    Markup.callbackButton('Report Resolved', `r_${rmsgId}_${chatId}`),
  ]);
  return Extra.markup(replyMarkup);
}

module.exports.hide = hide;
module.exports.start = start;
module.exports.report = report;
module.exports.resolvedBtn = resolvedBtn;
