const bot = {
  catch: () => {
    //
  },
  command: () => {},
  hears: () => {},
  on: () => {},
  action: () => {},
  launch: () => {},
  sendMessage() {
    return this;
  },
};
bot.telegram = {...bot};

module.exports = bot;
