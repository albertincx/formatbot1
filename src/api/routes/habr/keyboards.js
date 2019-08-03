const BUTTONS = require('../../../config/buttons');

const keyboards = {
  COMAGIC_NAME_WAIT: ['Мои компании'],
  sdsd: ['Мои компании'],
};
module.exports = keyboards;

function keybType(bot, key) {
  // let arrowQ = bot.inlineButton('Это Ключ.с', { callback: `q_${key}` });
  const arrowL = bot.inlineButton('Ссылки', { callback: `l_${key}` });
  const arrowT = bot.inlineButton('Расписания', { callback: `t_${key}` });
  const arrowQWithL = bot.inlineButton('Ключи и ссылки',
    { callback: `ql_${key}` });

  const arrows = [
    // arrowQ,
    arrowQWithL,
    arrowL,
    arrowT,
  ];
  const keyBoard = [arrows];
  const replyMarkup = bot.inlineKeyboard(keyBoard);
  return { replyMarkup };
}

function keybUpdate(bot) {
  const keyBoard = [];
  const arrowS = bot.inlineButton('Обновить',
    { callback: 'status_1' });
  keyBoard.push([arrowS]);
  const replyMarkup = bot.inlineKeyboard(keyBoard);
  return { replyMarkup };
}

function successType(bot, key, type) {
  const arrowQ = bot.inlineButton('Сменить', { callback: `change_${key}` });
  const arrows = [arrowQ];
  const keyBoard = [
    arrows,
  ];
  if (type === 't') {
    const arrowS = bot.inlineButton('Сгенерировать задания',
      { callback: `gentasks_${key}` });
    keyBoard.push([arrowS]);
  }
  const replyMarkup = bot.inlineKeyboard(keyBoard);
  return { replyMarkup };
}

function start(bot) {
  const replyMarkup = bot.keyboard([
    [BUTTONS.hello.label, BUTTONS.world.label],
    [BUTTONS.hide.label],
  ], { resize: true });
  return { replyMarkup };
}

function settings(bot) {
  const replyMarkup = bot.keyboard([
    [BUTTONS.enable.label],
    [BUTTONS.back.label],
  ], { resize: true });

  return { replyMarkup };
}

function disable(bot) {
  const replyMarkup = bot.keyboard([
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
