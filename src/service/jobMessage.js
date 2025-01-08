const url = require('url');
const {logger} = require('../api/utils/logger');

const {
  timeout,
  checkData
} = require('../api/utils');
const rabbitMq = require('./rabbitmq');
const ivMaker = require('../api/utils/ivMaker');
const {
  NO_PARSE,
  HELP_MESSAGE,
  TG_GROUP,
  TG_BUGS_GROUP,
  IV_MAKING_TIMEOUT
} = require('../config/vars');

const messages = require('../messages/format');
const db = require('../api/utils/db');
const keyboards = require('../keyboards/keyboards');
const {dbKeys} = require("../config/consts");

const group = TG_GROUP;
const groupBugs = TG_BUGS_GROUP;

const IV_TIMEOUT = +(IV_MAKING_TIMEOUT || 60);
const TIMEOUT_EXCEEDED = 'timedOut';
let skipCount = 0;

const jobMessage = (botHelper, browserWs, skip) => async task => {
  if (skip) {
    skipCount = 5;
  }

  const {
    chatId,
    message_id: messageId,
    force,
    isChanMesId,
    inline,
    w: isWorker,
    fromId,
    pdf,
    pdfReset,
    pdfTitle,
  } = task;

  let {link} = task;

  if (link.match(/^https?:\/\/t\.me\//)) {
    return;
  }

  const {host} = new url.URL(link);
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
    let linkData = {};
    let timeOutLink = false;
    let ivFromDb = false;
    let successIv = false;
    try {
      let params = rabbitMq.getMqParams();
      const isAdm = botHelper.isAdmin(chatId) || (fromId && botHelper.isAdmin(fromId));

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

      if (!isText && !pdf) {
        isFile = true;
        global.emptyTextCount = (global.emptyTextCount || 0) + 1;
      } else {
        global.emptyTextCount = 0;
        const IV_LIMIT = isAdm ? 120 : IV_TIMEOUT;

        checkData(host.match('djvu'));
        clearInterval(skipTimer);
        if (skipCount) {
          skipCount -= 1;
          timeOutLink = true;
          checkData(1, `skip links buffer ${skipCount}`);
        }
        checkData(botHelper.isBlackListed(host), 'BlackListed');

        const botParams = botHelper.getParams(host, chatId, force);
        params = {...params, ...botParams};
        params.browserWs = browserWs;
        params.db = botHelper.db !== false;
        if (isAdm && force === 'no_db') params.db = false;

        await timeout(0.2);
        let ivTask = Promise.resolve('skipped link');
        if (!NO_PARSE) {
          let parseStart = true;
          if (params.db) {
            const exist = await db.getIV(link);
            if (exist && exist.iv) {
              ivFromDb = true;
              exist.isLong = exist.p;
              ivTask = Promise.resolve(exist);
              parseStart = false;
            }
          }

          if (parseStart) {
            if (pdf) {
              // console.log(pdf);
              const pdfLink = await botHelper.bot.getFileLink(pdf);
              // console.log(pdfLink);
              params.pdf = pdfLink.href;
              params.pdfTitle = pdfTitle;
            }
            ivTask = ivMaker.makeIvLink(link, params);
          }
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
          .then(ivDataOrTimeout => {
            if (ivDataOrTimeout === TIMEOUT_EXCEEDED) {
              if (groupBugs) {
                botHelper.sendAdmin(`timedOut ${link}`, groupBugs);
              }
              timeOutLink = true;
            } else {
              linkData = ivDataOrTimeout;
            }
          });
        clearInterval(skipTimer);
        clearTimeout(timeoutRes);
      }
      logger(`isAdm = ${isAdm} force = ${force} worker = ${isWorker} db = ${ivFromDb}`);

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
        } = linkData;
        ivLink = iv;
        const longStr = isLong ? `Long${pages ? ` ${pages}` : ''}` : '';
        IV_TITLE = `${title}\n`;
        if (pdf) {
          let pdfUpd = {url: chatId}
          if (pdfReset) {
            pdfUpd.$inc = {count: 1};
            pdfUpd.af = 1;
          } else pdfUpd.iv = 'pdf';
          await db.updateOneLink(pdfUpd, db.getCol(dbKeys.counter));
        }
        RESULT = messages.showIvMessage(longStr, iv, `${link}`, host);
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

module.exports.jobMessage = jobMessage;
