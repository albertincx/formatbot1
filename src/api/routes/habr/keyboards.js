const BUTTONS = require('../../../config/buttons');

function start(bot) {
  const replyMarkup = bot.keyboard([
    [BUTTONS.hello.label, BUTTONS.world.label],
    [BUTTONS.hide.label],
  ], { resize: true });
  return { replyMarkup };
}

module.exports = {
  start,
};
