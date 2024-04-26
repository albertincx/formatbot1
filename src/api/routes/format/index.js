const url = require('url');

const keyboards = require('../../../keyboards/keyboards');
const messages = require('../../../messages/format');
const rabbitMq = require('../../../service/rabbitmq');

const {
  PUPPET_QUE,
  IS_PUPPET_DISABLED,
  NO_MQ,
  TG_BUGS_GROUP,
  TG_GROUP,
  IV_MAKING_TIMEOUT,
  IV_CHAN_ID,
  IV_CHAN_MID,
  IV_CHAN_MID_2,
  USER_IDS,
  HELP_MESSAGE,
  NO_PARSE,
} = require('../../../config/vars');

const db = require('../../utils/db');
const {
  check,
  timeout,
  checkData,
  toUrl
} = require('../../utils');
const {logger} = require('../../utils/logger');
const ivMaker = require('../../utils/ivMaker');
const puppet = require('../../utils/puppet');
const {
  getAllLinks,
  getLinkFromEntity,
  getLink
} = require('../../utils/links');
const {broadcast} = require('../../utils/broadcast');

const group = TG_GROUP;
const groupBugs = TG_BUGS_GROUP;

const IV_TIMEOUT = +(IV_MAKING_TIMEOUT || 60);
const userIds = (USER_IDS || '').split(',');
const TIMEOUT_EXCEEDED = 'timedOut';

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

  if (userIds.length && userIds.includes(`${chatId}`)) {
    return;
  }
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
  if (!ctx.message) {
    const {
      chat: {id: chatId},
    } = ctx.message;
    if (userIds.length && userIds.includes(`${chatId}`)) {
      return;
    }
  } else {
    const {
      chat: {id: chatId},
    } = ctx.message;
    if (userIds.length && userIds.includes(`${chatId}`)) {
      return;
    }
  }
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

let skipCount = 0;
global.emptyTextCount = 0;

const format = (bot, botHelper, skipCountBool) => {
  if (skipCountBool) {
    skipCount = 5;
  }
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
        .catch(e => logger(e));
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
      caption_entities: cEntities
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
      const force = isAdm && check(text);
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
        logger(e)
        logger('exit wrong url');
        return;
      }
      logger(parsed)
      if (link.match(/^(https?:\/\/)?(www.)?google/)) {
        const l = link.match(/url=(.*?)($|&)/);
        if (l && l[1]) link = decodeURIComponent(l[1]);
      }

      if (link.match(new RegExp(validRegex))) {
        ctx
          .reply(messages.showIvMessage('', link, link), {
            parse_mode: botHelper.markdown(),
          })
          .catch(e => botHelper.sendError(e));
        return;
      }
      if (link.match(/^((https?):\/\/)?(www\.)?(youtube|t)\.(com|me)\/?/)) {
        return;
      }

      if (link.match(/yandex\.ru\/showcap/)) {
        return;
      }

      // allow https only main page
      if (!parsed.pathname && !parsed.protocol.match('https')) {
        return;
      }

      let mid;
      if (!botHelper.waitSec) {
        const res =
          (await ctx.reply('Waiting for instantView...')
            .catch(() => {
            })) || {};
        const messageId = res && res.message_id;
        await timeout(0.1);
        if (!messageId) {
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
      if (force) {
        task.force = force;
      }
      let newIvTime = +new Date();
      newIvTime = (newIvTime - global.lastIvTime) / 1000;
      if (newIvTime > 3600) {
        global.lastIvTime = +new Date();
        botHelper.sendAdmin(`alert ${newIvTime} sec`);
      }
      if (NO_MQ) {
        console.log('cloud massaging is disabled');
        return jobMessage(task);
      }
      rabbitMq.addToChannel(task);
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
  }
  const jobMessage = async task => {
    const {
      chatId,
      message_id: messageId,
      force,
      isChanMesId,
      inline,
      w: isWorker,
    } = task;

    let {link} = task;

    if (link.match(/^https?:\/\/t\.me\//)) {
      return;
    }

    if (isWorker) {
      logger('Im a worker')
    }

    let error = '';
    let isBroken = false;
    const resolveMsgId = false;
    let ivLink = '';
    let skipTimer = 0;
    let timeoutRes;
    if (botHelper.waitSec) {
      await timeout(botHelper.waitSec, () => {
        botHelper.sendAdmin(`bot wait completed ${botHelper.waitSec}`);
      });
    }
    try {
      let RESULT;
      let IV_TITLE = '';
      let isFile = false;
      let linkData = '';
      let timeOutLink = false;
      let ivFromDb = false;
      let successIv = false;
      try {
        let params = rabbitMq.getMqParams();
        const isAdm = botHelper.isAdmin(chatId);
        logger(`isAdm = ${isAdm}`);
        logger(`force = ${force}`);
        if (isAdm) {
          params.isadmin = true;
        }
        rabbitMq.timeStart();
        link = ivMaker.parse(link);
        const {
          isText,
          url: baseUrl
        } = await ivMaker
          .isText(link, force)
          .catch(e => {
            logger(e);
            return {isText: false};
          });
        if (baseUrl !== link) {
          link = baseUrl;
        }

        if (!isText) {
          isFile = true;
          global.emptyTextCount = (global.emptyTextCount || 0) + 1;
        } else {
          global.emptyTextCount = 0;
          const IV_LIMIT = isAdm ? 120 : IV_TIMEOUT;
          const {hostname} = url.parse(link);
          checkData(hostname.match('djvu'));
          clearInterval(skipTimer);
          if (skipCount) {
            skipCount -= 1;
            timeOutLink = true;
            checkData(1, `skip links buffer ${skipCount}`);
          }
          checkData(botHelper.isBlackListed(hostname), 'BlackListed');

          const botParams = botHelper.getParams(hostname, chatId, force);
          params = {...params, ...botParams};
          params.browserWs = browserWs;
          params.db = botHelper.db !== false;
          if (force === 'nodb' && isAdm) {
            params.db = false;
          }
          await timeout(0.2);
          let ivTask = Promise.resolve('skipped link');
          if (!NO_PARSE) {
            ivTask = ivMaker.makeIvLink(link, params);
          }
          const ivTimer = new Promise(resolve => {
            skipTimer = setInterval(() => {
              if (skipCount) {
                clearInterval(skipTimer);
                resolve(TIMEOUT_EXCEEDED);
              }
            }, 1000);
            timeoutRes = setTimeout(resolve, IV_LIMIT * 1000, TIMEOUT_EXCEEDED);
          });
          await Promise.race([ivTimer, ivTask])
            .then(value => {
              if (value === TIMEOUT_EXCEEDED) {
                if (groupBugs) {
                  botHelper.sendAdmin(`timedOut ${link}`, groupBugs);
                }
                timeOutLink = true;
              } else {
                linkData = value;
              }
            });
          clearInterval(skipTimer);
          clearTimeout(timeoutRes);
        }
        if (isFile) {
          RESULT = messages.isLooksLikeFile(link);
        } else if (timeOutLink) {
          IV_TITLE = '';
          RESULT = messages.timeOut();
        } else if (linkData.error) {
          RESULT = messages.brokenFile(linkData.error);
        } else {
          const {
            iv,
            isLong,
            pages = '',
            ti: title = '',
            isFromDb = false,
          } = linkData;
          if (isFromDb) {
            ivFromDb = true;
          }
          ivLink = iv;
          const longStr = isLong ? `Long ${pages}` : '';
          IV_TITLE = `${title}\n`;
          RESULT = messages.showIvMessage(longStr, iv, `${link}`);
          successIv = true;
        }
      } catch (e) {
        logger(e);
        clearInterval(skipTimer);
        isBroken = true;
        if (timeOutLink) {
          IV_TITLE = '';
          RESULT = messages.timeOut();
        } else {
          RESULT = messages.broken(link, HELP_MESSAGE || '');
        }
        successIv = false;
        error = `broken ${link} ${e}`;
      }
      const durationTime = rabbitMq.time();
      if (global.emptyTextCount > 10) {
        botHelper.sendAdmin('@admin need to /restartApp');
      }
      const extra = {parse_mode: botHelper.markdown()};
      const messageText = `${IV_TITLE && ivLink ? `[${IV_TITLE}](${ivLink})` : ''}
${RESULT}`;
      if (inline) {
        let title = '';
        if (error || !ivLink) {
          title = 'Sorry IV not found';
          ivLink = title;
        }
        await botHelper
          .sendInline({
            title,
            messageId,
            ivLink,
          })
          .then(() => db.removeInline(link))
          .catch(() => {
            db.removeInline(link);
          });
      } else {
        if (isChanMesId) {
          let toDelete = messageId;
          if (!error) {
            await botHelper.sendIV(chatId, messageId, null, messageText, extra);
            toDelete = isChanMesId;
          }
          await botHelper.delMessage(chatId, toDelete);
        } else if (successIv) {
          await botHelper.sendIVNew(chatId, messageText, extra);
          if (messageId) {
            await botHelper.delMessage(chatId, messageId);
          }
        } else {
          await botHelper.sendIV(chatId, messageId, null, messageText, extra);
        }

        global.lastIvTime = +new Date();
      }

      if (!error) {
        let mark = inline ? 'i' : '';
        if (isChanMesId) {
          mark += 'c';
        }
        if (ivFromDb) {
          mark += ' db';
        }
        const text = `${mark ? `${mark} ` : ''}[InstantView](${ivLink}) ${RESULT}\n${durationTime}`;
        if (group) {
          botHelper.sendAdminMark(text, group);
        }
      }
    } catch (e) {
      logger(e);
      error = `${link} error: ${JSON.stringify(
        e,
      )} ${e.toString()} ${chatId} ${messageId}`;
    }
    clearTimeout(timeoutRes);
    if (error) {
      logger(`error = ${error}`);
      if (isBroken && resolveMsgId) {
        botHelper.sendAdminOpts(
          error,
          keyboards.resolvedBtn(resolveMsgId, chatId),
        );
      } else if (groupBugs) {
        botHelper.sendAdmin(error, groupBugs);
      }
    }
  };

  try {
    rabbitMq.runMqChannels(jobMessage);
  } catch (e) {
    botHelper.sendError(e);
  }
};

module.exports = format;
