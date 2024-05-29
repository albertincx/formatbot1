const url = require('url');

const keyboards = require('../../../keyboards/keyboards');
const messages = require('../../../messages/format');
const rabbitMq = require('../../../service/rabbitmq');

const {
  PUPPET_QUE,
  IS_PUPPET_DISABLED,
  NO_MQ,
  IV_CHAN_ID,
  IV_CHAN_MID,
  IV_CHAN_MID_2,
} = require('../../../config/vars');

const db = require('../../utils/db');
const {
  commandCheck,
  timeout,
  toUrl
} = require('../../utils');
const {logger} = require('../../utils/logger');
const puppet = require('../../utils/puppet');
const {
  getAllLinks,
  getLinkFromEntity,
  getLink
} = require('../../utils/links');
const {broadcast} = require('../../utils/broadcast');
const {jobMessage} = require('../../../service/jobMessage');

global.lastIvTime = +new Date();

const validRegex = '^(https?:\\/\\/)?(www.)?(graph.org|telegra.ph|www.youtube.com\/watch)';

if (!NO_MQ) {
  rabbitMq.startFirst();
}

const support = async (ctx, botHelper) => {
  let system = JSON.stringify(ctx.message.from);
  const {
    chat: {id: chatId},
  } = ctx.message;

  try {
    if (!Number.isNaN(IV_CHAN_MID)) {
      botHelper
        .forwardMes(IV_CHAN_MID, IV_CHAN_ID * -1, chatId)
        .catch(() => {
        });
    }
    if (!Number.isNaN(IV_CHAN_MID_2)) {
      botHelper
        .forwardMes(IV_CHAN_MID_2, IV_CHAN_ID * -1, chatId)
        .catch(() => {
        });
    }
  } catch (e) {
    system = `${e}${system}`;
  }
  botHelper.sendAdmin(`support ${system}`);
};

const startOrHelp = (ctx, botHelper) => {
  if (ctx && ctx.message.text && ctx.message.text.match(/\/start\s(.*?)/)) {
    const cmd = ctx.message.text.match(/\/start\s(.*?)$/)[1];
    if (cmd === 'support') {
      support(ctx, botHelper);
      return;
    }
  }

  let system = JSON.stringify(ctx.message.from);
  try {
    ctx.reply(messages.start(), keyboards.start());
  } catch (e) {
    system = `${e}${system}`;
  }

  return botHelper.sendAdmin(system);
};

global.emptyTextCount = 0;

const format = (bot, botHelper, skipCountBool) => {
  bot.command(['start', 'help'], ctx => startOrHelp(ctx, botHelper));

  bot.command(['createBroadcast', 'startBroadcast'], ctx =>
    broadcast(ctx, botHelper),
  );

  bot.hears('👋 Help', ctx => startOrHelp(ctx, botHelper));
  bot.hears('👍Support', ctx => support(ctx, botHelper));
  bot.command('support', ctx => support(ctx, botHelper));
  bot.hears('⌨️ Hide keyboard', ctx => {
    try {
      ctx.reply('Type /help to show.', keyboards.hide());
    } catch (e) {
      botHelper.sendError(e);
    }
  });

  bot.on('inline_query', async msg => {
    const {id} = msg.update.inline_query;
    let {query} = msg.update.inline_query;
    query = query.trim();
    const links = getAllLinks(query);
    if (links.length === 0) {
      const res = {
        type: 'article',
        id,
        title: 'Links not found',
        cache_time: 0,
        is_personal: true,
        input_message_content: {message_text: 'Links not found'},
      };
      return msg.answerInlineQuery([res])
        .catch(() => {
        });
    }
    const ivObj = await db.getIV(links[0])
      .catch(() => false);
    if (ivObj && ivObj.iv) {
      return botHelper
        .sendInline({
          messageId: id,
          ivLink: ivObj.iv,
        })
        .catch(e => {
          logger('sendInline');
          logger(e);
        });
    }
    const exist = await db.getInline(links[0])
      .catch(() => false);
    const res = {
      type: 'article',
      id,
      title: 'Waiting for InstantView... Type \'Any symbol\' to check',
      input_message_content: {message_text: links[0]},
    };
    if (!exist) {
      rabbitMq.addToChannel({
        message_id: id,
        chatId: msg.from.id,
        link: links[0],
        inline: true,
      });
    }
    return msg
      .answerInlineQuery([res], {
        cache_time: 60,
        is_personal: true,
      })
      .catch(() => {
      });
  });

  bot.action(/.*/, async ctx => {
    const [data] = ctx.match;
    logger('action');
    const s = data === 'no_img';
    if (s) {
      const {message} = ctx.update.callback_query;
      const {
        message_id,
        chat,
        entities
      } = message;

      const actionMessage = {
        message_id,
        chatId: chat.id,
        link: entities[1].url,
      };

      rabbitMq.addToChannel(actionMessage, PUPPET_QUE);
      return;
    }
    const resolveDataMatch = data.match(/^r_([0-9]+)_([0-9]+)/);
    if (resolveDataMatch) {
      const [, msgId, userId] = resolveDataMatch;
      const extra = {reply_to_message_id: msgId};
      let error = '';
      try {
        await bot.telegram.sendMessage(userId, messages.resolved(), extra);
      } catch (e) {
        error = JSON.stringify(e);
      }
      const {
        update: {callback_query},
      } = ctx;
      const {
        message: {
          text,
          message_id
        },
        from,
      } = callback_query;
      const RESULT = `${text}\nResolved! ${error}`;
      await bot.telegram
        .editMessageText(from.id, message_id, null, RESULT)
        .catch(() => {
        });
    }
  });

  const addToQueue = async ctx => {
    const {update} = ctx;
    let {message} = ctx;
    const isChannelPost = update && update.channel_post;
    if (
      message &&
      message.text &&
      message.text.match(/(createBroadcast|startBroadcast)/)
    ) {
      broadcast(ctx, botHelper);
      return;
    }
    let isChanMesId = false;
    if (isChannelPost) {
      message = update.channel_post;
    }

    const {
      reply_to_message: rplToMsg,
      caption_entities: cEntities,
      from,
    } =
    message || {};
    if (rplToMsg || message.audio) {
      return;
    }
    let {entities} = message;

    const msg = message;
    if (isChannelPost) {
      isChanMesId = msg.message_id;
    }
    const {
      chat: {id: chatId},
      caption,
    } = msg;
    let {text} = msg;

    const isAdm = botHelper.isAdmin(chatId);
    const rpl = rplToMsg;
    if (msg.document || (rpl && rpl.document)) {
      return;
    }

    if (caption) {
      text = caption;
      if (cEntities) {
        entities = cEntities;
      }
    }
    if (msg && text) {
      let links = getAllLinks(text);
      let link = links[0];
      if (!link && entities) {
        links = getLinkFromEntity(entities, text);
      }
      link = getLink(links);
      if (!link) return;
      let parsed;
      if (link) {
        link = toUrl(link);
      }
      try {
        parsed = new url.URL(link);
      } catch (e) {
        logger('exit wrong url');
        logger(e);
        return;
      }
      logger('parsed');
      logger(parsed.protocol);
      try {

        if (link.match(/^(https?:\/\/)?(www.)?google/)) {
          const l = link.match(/url=(.*?)($|&)/);
          if (l && l[1]) link = decodeURIComponent(l[1]);
        }

        if (link.match(new RegExp(validRegex))) {
          ctx
            .reply(messages.showIvMessage('', link, link, parsed.host), {
              parse_mode: botHelper.markdown(),
            })
            .catch(e => {
              logger('reply');
              logger(e);
              botHelper.sendError(e);
            });
          return;
        }
        if (link.match(/^((https?):\/\/)?(www\.)?(youtube|t)\.(com|me)\/?/)) {
          logger('youtube exit')
          return;
        }

        if (link.match(/yandex\.ru\/showcap/)) {
          logger('yandex cap')
          return;
        }

        // allow https only main page
        if (!parsed.pathname && !parsed.protocol.match('https')) {
          logger('main no ssl')
          return;
        }

        let mid;
        if (!botHelper.waitSec) {
          const res = await ctx.reply('Waiting for instantView...')
            .catch((e) => {
              logger('reply wait');
              logger(e);
              return {};
            });

          const messageId = res && res.message_id;
          await timeout(0.1);
          if (!messageId) {
            logger('no MessageId exit')
            return;
          }
          mid = messageId;
        }
        const task = {
          message_id: mid,
          chatId,
          link,
          isChanMesId,
        };
        if (from) {
          task.fromId = from.id;
        }
        const force = (isAdm || (task.fromId && botHelper.isAdmin(task.fromId))) && commandCheck(text);
        if (force) {
          task.force = force;
        }
        let newIvTime = +new Date();
        newIvTime = (newIvTime - global.lastIvTime) / 1000;
        if (newIvTime > 3600) {
          global.lastIvTime = +new Date();
          botHelper.sendAdmin(`alert ${newIvTime} sec`);
        }
        if (from) {
          task.fromId = from.id;
        }

        if (NO_MQ) {
          console.log('cloud massaging is disabled');
          return jobMessage(task);
        }
        logger('sent to channel')
        rabbitMq.addToChannel(task);
      } catch (e) {
        logger('send error')
        logger(e)
      }
    }
  };

  bot.on('channel_post', ctx =>
    addToQueue(ctx)
      .catch(e =>
        botHelper.sendError(`tg err1: ${JSON.stringify(e)}`),
      ),
  );

  bot.hears(/.*/, ctx =>
    addToQueue(ctx)
      .catch(e =>
        botHelper.sendError(`tg err2: ${JSON.stringify(e)}`),
      ),
  );

  bot.on('message', ctx =>
    addToQueue(ctx)
      .catch(e =>
        botHelper.sendError(`tg err3: ${JSON.stringify(e)}`),
      ),
  );

  let browserWs = null;
  if (!botHelper.config.no_puppet && !IS_PUPPET_DISABLED) {
    puppet.getBrowser()
      .then(ws => {
        browserWs = ws;
      });
  };

  try {
    rabbitMq.runMqChannels(jobMessage(botHelper, browserWs, skipCountBool));
  } catch (e) {
    botHelper.sendError(e);
  }
};

module.exports = format;
