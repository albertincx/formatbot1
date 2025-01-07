const bot = {
  catch: () => {
    //
  },
  command: () => {
  },
  hears: () => {
  },
  on: () => {
  },
  action: () => {
  },
  launch: () => ({
    catch: () => {
    }
  }),
  sendMessage() {
    return this;
  },
  stop: () => {},
};
bot.telegram = {...bot};

module.exports = bot;
