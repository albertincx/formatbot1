const url = require('url');
const fileSlave = require('./files');
const keyboards = require('./keyboards');

const messages = require('../../../messages/format');
const db = require('../../utils/db');
const logger = require('../../utils/logger');
const {log} = require('../../utils/db');
const ivMaker = require('../../utils/ivMaker');
const puppet = require('../../utils/puppet');
const {check, timeout, checkData} = require('../../utils');
const {getAllLinks, getLinkFromEntity, getLink} = require('../../utils/links');

const {validRegex} = require('../../../config/config.json');

const rabbitmq = require('../../../service/rabbitmq');

const group = process.env.TGGROUP;
const fileGroup = process.env.TGFILEGROUP;
const {SLAVE_PROCESS} = process.env;
// const TG_UPDATES_CHANID = process.env.TG_UPDATES_CHANID;
let MAIN_CHAN = '';

if (SLAVE_PROCESS) {
  MAIN_CHAN = process.env.FILESCHAN_DEV || 'files';
}
const IV_MAKING_TIMEOUT = +(process.env.IV_MAKING_TIMEOUT || 60);
rabbitmq.startChannel();
global.lastIvTime = +new Date();

const support = ({message, reply}, botHelper) => {
  let system = JSON.stringify(message.from);
  try {
    const sup = [
      process.env.SUP_LINK,
      process.env.SUP_LINK1,
      process.env.SUP_LINK2,
      process.env.SUP_LINK3,
    ];
    const hide = Object.create(keyboards.hide());
    reply(messages.support(sup), {
      hide,
      disable_web_page_preview: true,
    }).catch(e => botHelper.sendError(e));
  } catch (e) {
    system = `${e}${system}`;
  }
  botHelper.sendAdmin(`support ${system}`);
};

const startOrHelp = ({message, reply, update}, botHelper) => {
  if (!message) {
    return botHelper.sendAdmin(JSON.stringify(update));
  }
  let system = JSON.stringify(message.from);
  try {
    reply(messages.start(), keyboards.start());
  } catch (e) {
    system = `${e}${system}`;
    botHelper.sendError(e);
  }

  return botHelper.sendAdmin(system);
};

const broadcast = ({message: msg, reply}, botHelper) => {
  const {
    chat: {id: chatId},
    text,
  } = msg;
  const isAdm = botHelper.isAdmin(chatId);
  if (isAdm && text) {
    return db.processBroadcast(text, reply, botHelper);
  }

  return Promise.resolve();
};

const format = (bot, botHelper) => {
  bot.command(['/start', '/help'], ctx => startOrHelp(ctx, botHelper));
  bot.command(['/createBroadcast', '/startBroadcast'], ctx =>
    broadcast(ctx, botHelper),
  );
  bot.hears('👋 Help', ctx => startOrHelp(ctx, botHelper));
  bot.hears('👍Support', ctx => support(ctx, botHelper));
  bot.command('support', ctx => support(ctx, botHelper));
  bot.hears('⌨️ Hide keyboard', ({reply}) => {
    try {
      reply('Type /help to show.', keyboards.hide());
    } catch (e) {
      botHelper.sendError(e);
    }
  });

  bot.on('inline_query', async msg => {
    const {id} = msg.update.inline_query;
    let {query} = msg.update.inline_query;
    query = query.trim();
    const links = getAllLinks(query);
    if (!botHelper.isAdmin(msg.from.id) || !links[0]) {
      const res = {
        type: 'article',
        id,
        title: 'Links not found',
        input_message_content: {message_text: 'Links not found'},
      };
      return msg.answerInlineQuery([res]).catch(() => {});
    }
    const ivObj = await db.get(links[0]);
    if (ivObj) {
      return botHelper
        .sendInline({
          messageId: id,
          ivLink: ivObj.iv,
        })
        .catch(e => logger(e));
    }
    const exist = await db.getInine(links[0]);

    /* let result = await bot.telegram.getChatMember(TG_UPDATES_CHANID,
      msg.from.id).catch(console.log); */

    const res = {
      type: 'article',
      id,
      title: "Waiting for InstantView... Type 'Space' to check",
      input_message_content: {message_text: links[0]},
    };
    if (!exist) {
      await rabbitmq
        .addToQueue({
          message_id: id,
          chatId: msg.from.id,
          link: links[0],
          inline: true,
        })
        .catch(() => {});
    }
    return msg
      .answerInlineQuery([res], {cache_time: 0, is_personal: true})
      .catch(() => {});
  });

  bot.action(/.*/, async ctx => {
    const [data] = ctx.match;
    const s = data === 'no_img';
    if (s) {
      const {message} = ctx.update.callback_query;
      // eslint-disable-next-line camelcase
      const {message_id, chat, entities} = message;
      const rabbitMes = {message_id, chatId: chat.id, link: entities[1].url};
      await rabbitmq
        .addToQueue(rabbitMes, rabbitmq.chanPuppet())
        .catch(() => {});
      return;
    }
    const resolveDataMatch = data.match(/^r_([0-9]+)_([0-9]+)/);
    if (resolveDataMatch) {
      const [, msgId, userId] = resolveDataMatch;
      const extra = {reply_to_message_id: msgId};
      let error = '';
      try {
        await bot.telegram
          .sendMessage(userId, messages.resolved(), extra)
          .catch(() => {});
      } catch (e) {
        error = JSON.stringify(e);
      }
      const {
        // eslint-disable-next-line camelcase
        update: {callback_query},
      } = ctx;
      const {
        // eslint-disable-next-line camelcase
        message: {text, message_id},
        from, // eslint-disable-next-line camelcase
      } = callback_query;
      const RESULT = `${text}\nResolved! ${error}`;
      await bot.telegram
        .editMessageText(from.id, message_id, null, RESULT)
        .catch(console.log);
    }
  });

  const addToQueue = async ({message = {}, reply, update}) => {
    if (SLAVE_PROCESS) {
      return;
    }
    let isChanMesId = false;
    if (update && update.channel_post) logger(update.channel_post.chat);
    logger(message);
    const {reply_to_message: rplToMsg, caption_entities: cEntities} = message;
    if (rplToMsg) {
      return;
    }
    let {entities} = message;

    let msg = message;
    if (update && update.channel_post) {
      msg = update.channel_post;
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
      try {
        let link = links[0];
        if (!link && entities) {
          links = getLinkFromEntity(entities, text);
        }
        link = getLink(links);
        if (!link) return;
        const parsed = url.parse(link);
        if (link.match(/^(https?:\/\/)?(www.)?google/)) {
          const l = link.match(/url=(.*?)($|&)/);
          if (l && l[1]) link = decodeURIComponent(l[1]);
        }
        if (link.match(new RegExp(validRegex))) {
          if (botHelper.db !== false) {
            await log({link, type: 'return'});
          }
          reply(messages.showIvMessage('', link, link), {
            parse_mode: 'Markdown',
          }).catch(e => botHelper.sendError(e));
          return;
        }
        if (!parsed.pathname) {
          if (botHelper.db !== false) {
            await log({link, type: 'nopath'});
          }
          return;
        }
        const res =
          (await reply('Waiting for instantView...').catch(() => {})) || {};
        const messageId = res && res.message_id;
        checkData(!messageId, 'blocked');
        const rabbitMes = {
          message_id: messageId,
          chatId,
          link,
          isChanMesId,
        };
        if (force) {
          rabbitMes.force = force;
        }
        let newIvTime = +new Date();
        newIvTime = (newIvTime - global.lastIvTime) / 1000;
        if (newIvTime > 3600) {
          global.lastIvTime = +new Date();
          botHelper.sendAdmin(`alert ${newIvTime} sec`);
        }
        await rabbitmq.addToQueue(rabbitMes);
      } catch (e) {
        botHelper.sendError(e);
      }
    }
  };

  bot.hears(/.*/, ctx => addToQueue(ctx));
  bot.on('message', ({update, reply}) => addToQueue({...update, reply}));

  let browserWs = null;
  if (!botHelper.config.no_puppet && !process.env.NOPUPPET) {
    puppet.getBrowser().then(ws => {
      browserWs = ws;
    });
  }
  const jobMessage = async task => {
    const {
      chatId,
      message_id: messageId,
      q,
      force,
      document,
      isChanMesId,
      inline,
    } = task;
    let {link} = task;
    let error = '';
    let isBroken = false;
    const resolveMsgId = false;
    let logGroup = group;
    let ivLink = '';
    let skipTimer = 0;
    try {
      let RESULT = '';
      let TITLE = '';
      let isFile = false;
      let linkData = '';
      let timeOutLink = false;
      try {
        logger(`db is ${botHelper.db}`);
        logger(`queue job ${q}`);
        let params = rabbitmq.getParams(q);
        const isAdm = botHelper.isAdmin(chatId);
        if (isAdm) {
          params.isadmin = true;
        }
        if (SLAVE_PROCESS) {
          logger(task);
          // await timeout(120);
          try {
            const {isHtml, content} = await fileSlave.putFile(
              task.doc,
              botHelper,
            );
            linkData = await ivMaker.makeIvLinkFromContent(
              {
                content,
                isHtml,
                file_name: task.doc.file_name,
              },
              params,
            );
          } catch (e) {
            error = `${e}`;
            linkData = {error};
            botHelper.sendAdmin(error, process.env.TGGROUPBUGS);
          }
          await rabbitmq.addToQueue({
            document: linkData,
            chatId,
            message_id: messageId,
          });
          return;
        }
        rabbitmq.time(q, true);
        let source = `${link}`;
        if (document) {
          linkData = document;
          logGroup = fileGroup;
          source = 'document';
        } else {
          link = ivMaker.parse(link);
          const {isText, url: baseUrl} = await ivMaker.isText(link, force);
          if (baseUrl !== link) link = baseUrl;
          if (!isText) {
            isFile = true;
          } else {
            const {hostname} = url.parse(link);
            logger(hostname);
            logger(link);
            checkData(hostname.match('djvu'));
            clearInterval(skipTimer);
            // console.log(link)
            if (global.skipCount) {
              global.skipCount -= 1;
              timeOutLink = true;
              checkData(1, `skip links buffer ${global.skipCount}`);
            }
            checkData(botHelper.isBlackListed(hostname), 'BlackListed');
            const botParams = botHelper.getParams(hostname, chatId, force);
            params = {...params, ...botParams};
            params.browserWs = browserWs;
            params.db = botHelper.db !== false;
            logger(params);
            await timeout(0.1);
            const ivTask = ivMaker.makeIvLink(link, params);
            const ivTimer = new Promise(resolve => {
              skipTimer = setInterval(() => {
                if (global.skipCount) {
                  clearInterval(skipTimer);
                  resolve('timedOut');
                }
              }, 1000);
              setTimeout(resolve, IV_MAKING_TIMEOUT * 1000, 'timedOut');
            });
            await Promise.race([ivTimer, ivTask]).then(value => {
              if (value === 'timedOut') {
                botHelper.sendAdmin(
                  `timedOut ${link}`,
                  process.env.TGGROUPBUGS,
                );
                timeOutLink = true;
              } else {
                linkData = value;
              }
            });
            clearInterval(skipTimer);
          }
        }
        if (isFile) {
          RESULT = messages.isLooksLikeFile(link);
        } else if (timeOutLink) {
          TITLE = '';
          RESULT = messages.timeOut();
        } else if (linkData.error) {
          RESULT = messages.brokenFile(linkData.error);
        } else {
          const {iv, isLong, pages = '', push = '', title = ''} = linkData;
          ivLink = iv;
          const longStr = isLong ? `Long ${pages}/${push} ` : '';
          TITLE = `${title}\n`;
          RESULT = messages.showIvMessage(longStr, iv, source);
        }
      } catch (e) {
        logger(e);
        clearInterval(skipTimer);
        isBroken = true;
        if (timeOutLink) {
          TITLE = '';
          RESULT = messages.timeOut();
        } else {
          RESULT = messages.broken(link);
        }
        error = `broken ${link} ${e}`;
      }
      const t = rabbitmq.time(q);
      const extra = {parse_mode: 'Markdown'};
      const messageText = `${TITLE}${RESULT}`;
      if (inline) {
        let title = '';
        if (error) {
          title = 'Sorry IV not found';
          ivLink = error;
        }
        await botHelper
          .sendInline({
            title,
            messageId,
            ivLink,
          })
          .then(() => db.removeInline(link))
          .catch(() => {});
      } else {
        await bot.telegram
          .editMessageText(chatId, messageId, null, messageText, extra)
          .catch(() => {});
        global.lastIvTime = +new Date();
      }

      if (!error) {
        let mark = inline ? 'inl' : '';
        if (isChanMesId) mark += 'chan';
        const text = `${mark ? `${mark} ` : ''}${RESULT}${
          q ? ` from ${q}` : ''
        }\n${t}`;
        botHelper.sendAdminMark(text, logGroup).catch(() => {});
      }
    } catch (e) {
      logger(e);
      error = `${link} error: ${JSON.stringify(
        e,
      )} ${e.toString()} ${chatId} ${messageId}`;
    }
    logger(error);
    if (error) {
      if (botHelper.db !== false && !SLAVE_PROCESS) {
        await log({url: link, type: 'error', error});
      }
      if (isBroken && resolveMsgId) {
        botHelper
          .sendAdminOpts(error, keyboards.resolvedBtn(resolveMsgId, chatId))
          .catch(() => {});
      } else {
        botHelper.sendAdmin(error, process.env.TGGROUPBUGS).catch(() => {});
      }
    }
  };

  try {
    setTimeout(() => {
      rabbitmq.run(jobMessage, MAIN_CHAN);
      rabbitmq.runSecond(jobMessage);
      rabbitmq.runPuppet(jobMessage);
    }, 5000);
  } catch (e) {
    botHelper.sendError(e);
  }
};

module.exports = format;
