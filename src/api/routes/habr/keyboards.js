const BUTTONS = require('../../../config/buttons');
const keyboards = {
  COMAGIC_NAME_WAIT: ['Мои компании'],
  'sdsd': ['Мои компании'],
};
module.exports = keyboards;

function keybType(bot, key) {
  // let arrowQ = bot.inlineButton('Это Ключ.с', { callback: `q_${key}` });
  let arrowL = bot.inlineButton('Ссылки', { callback: `l_${key}` });
  let arrowT = bot.inlineButton('Расписания', { callback: `t_${key}` });
  let arrowQWithL = bot.inlineButton('Ключи и ссылки',
      { callback: `ql_${key}` });

  let arrows = [
    // arrowQ,
    arrowQWithL,
    arrowL,
    arrowT,
  ];
  const keyBoard = [arrows];
  let replyMarkup = bot.inlineKeyboard(keyBoard);
  return { replyMarkup };
}

function keybUpdate(bot, key, type) {
  let keyBoard = [];
  let arrowS = bot.inlineButton('Обновить',
      { callback: `status_1` });
  keyBoard.push([arrowS]);
  let replyMarkup = bot.inlineKeyboard(keyBoard);
  return { replyMarkup };
}

function successType(bot, key, type) {
  let arrowQ = bot.inlineButton('Сменить', { callback: `change_${key}` });
  let arrows = [arrowQ];
  const keyBoard = [
    arrows,
  ];
  if (type === 't') {
    let arrowS = bot.inlineButton('Сгенерировать задания',
        { callback: `gentasks_${key}` });
    keyBoard.push([arrowS]);
  }
  let replyMarkup = bot.inlineKeyboard(keyBoard);
  return { replyMarkup };
}

function start(bot) {
  let replyMarkup = bot.keyboard([
    [BUTTONS.hello.label, BUTTONS.world.label],
    [BUTTONS.hide.label],
  ], { resize: true });
  return { replyMarkup };
}

function settings(bot) {
  let replyMarkup = bot.keyboard([
    [BUTTONS.enable.label],
    [BUTTONS.back.label],
  ], { resize: true });

  return { replyMarkup };
}

function disable(bot) {
  let replyMarkup = bot.keyboard([
    [BUTTONS.disable.label],
    [BUTTONS.back.label],
  ], { resize: true });

  return { replyMarkup };
}

module.exports = {
  keybType,
  successType,
  settings,
  start,
  disable,
  keybUpdate,
};
