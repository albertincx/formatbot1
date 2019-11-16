const fs = require('fs');
const test = require('ava');
const TeleBot = require('telebot');
const puppet = require('../api/utils/puppet');
const { NOBOT, PORT } = require('../config/vars');
// Globals
var bot;

// Enviroment data

let {
  TBTKNHABR: TOKEN,
  TGADMIN: USER
} = process.env;

test('bot environment', t => {
  t.true(!!TOKEN, 'TEST_TELEBOT_TOKEN required');
  t.true(!!USER, 'TEST_TELEBOT_USER required');
});

test('bot object', t => {
  const newSet = {
    token: TOKEN,
    polling: {
      interval: 100,
      limit: 50,
      timeout: 0,
      retryTimeout: 5000
    }
  };

  function check(bot) {
    t.is(bot.token, TOKEN);
    t.is(bot.id, TOKEN.split(':')[0]);
  }

  check(new TeleBot(TOKEN));
  check(bot = new TeleBot(newSet));

  for (let name in newSet.polling) {
    t.is(bot[name], newSet.polling[name]);
  }

  // Start
  bot.start();
  t.not(bot.loopFn, null);
  t.deepEqual(bot.flags, {
    looping: true,
    poll: false,
    retry: false
  });

  // Stop
  bot.stop();
  t.false(bot.flags.looping);

});

test('events', t => {

  t.plan(9);

  function len(event) {
    return bot.eventList.get(event).list.length;
  }

  function count() {
    return bot.eventList.size;
  }

  var delMe = () => {
  };

  t.is(count(), 2);

  // Set
  bot.on('start', () => {
  });
  bot.on('start', delMe);
  bot.on('custom', () => {
  });
  bot.on('custom', () => {
  });
  bot.on('custom', () => {
  });

  // Count
  t.is(len('custom'), 3);
  t.is(len('start'), 2);
  t.is(count(), 3);

  // Remove
  t.true(bot.removeEvent('start', delMe));
  t.is(len('start'), 1);

  // Clean
  t.true(bot.cleanEvent('custom'));

  // Destroy
  t.true(bot.destroyEvent('custom'));
  t.is(count(), 2);

});

test('mods', t => {

  const defModCount = bot.buildInPlugins.length + bot.usePlugins.length;

  function len(event) {
    return bot.modList[event].length;
  }

  var delMe = x => x;

  t.is(all(bot.modList), defModCount);

  // Set
  bot.mod('custom', x => ++x);
  bot.mod('custom', x => ++x);
  bot.mod('custom', delMe);
  bot.mod('custom', x => ++x);

  // Count
  t.is(len('custom'), 4);
  t.is(all(bot.modList), 1 + defModCount);

  // Run
  t.is(bot.modRun('custom', 5), 8);

  // Remove
  t.true(bot.removeMod('custom', delMe));
  t.false(bot.removeMod('custom'));
  t.false(bot.removeMod('not_found'));

  t.is(len('custom'), 3);
  t.is(all(bot.modList), 1 + defModCount);

});

test('bot.TelegraphLink', async (t) => {
  return bot.sendMessage(USER, 'wait')
    .then(async (re) => {
      let url = process.env.TEST_LINK;
      const ivMaker = require('../api/utils/ivMaker');
      const { iv, source, isLong } = await ivMaker.makeIvLink(url);
      const chatId = USER;
      const messageId = re.message_id;
      return bot.editMessageText({
        chatId,
        messageId
      }, `text ${iv}`);
    })
    .then(re => t.true(!!re));
});
test('bot.TelegraphLinkAsync', async (t) => {
  return bot.sendMessage(USER, 'wait')
    .then(async (re) => {
      let browserWs = await puppet.getBrowser();
      let url = 'https://theinitium.com/article/20191113-hongkong-cuhk-protest-police/';
      const ivMaker = require('../api/utils/ivMaker');
      const { iv, source, isLong } = await ivMaker.makeIvLink(url, browserWs);
      const chatId = USER;
      const messageId = re.message_id;
      return bot.editMessageText({
        chatId,
        messageId
      }, `text ${iv}`);
    })
    .then(re => t.true(!!re));
});

function all(obj) {
  return Object.keys(obj).length;
}
