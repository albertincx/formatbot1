const {
  MONGO_URI_SECOND,
  MONGO_URI_BROAD,
  DEV_USERNAME,
} = require('../../config/vars');
const Any = require('../models/any.model');
const {createConnection} = require('../../config/mongoose');
const co = require('co');
const {logger} = require('./logger');
const mongoose = require('mongoose');

const cBroad = '/createBroadcast';
const sBroad = '/startBroadcast';

const processRows = async (cc, limit = 25, timeout, cb) => {
  if (!cb) {
    return;
  }
  let items = [];
  await co(function* () {
    for (let doc = yield cc.next(); doc != null; doc = yield cc.next()) {
      const item = doc.toObject();
      if (items.length === limit) {
        try {
          yield cb(items);
        } catch (e) {
          console.log(e);
        }
        items = [];
        if (timeout) {
          yield new Promise(resolve => setTimeout(() => resolve(), timeout));
        }
      }
      items.push(item);
    }
  });
  if (items.length) {
    try {
      await cb(items);
    } catch (e) {
      console.log(e);
    }
  }
};

const getCmdParams = txt => {
  let l = txt.match(/r_c_id_([0-9_-]+)/);
  if (l && l[1]) {
    l = l[1].split('_')
      .map(Number);
  }
  return l || [];
};

const createBroadcast = async (ctx, txt) => {
  const [cId, onlyMe] = getCmdParams(txt);
  if (!cId) {
    return ctx.reply('broad err no id');
  }
  const connSecond = createConnection(MONGO_URI_SECOND);
  const model = connSecond.model('broadcasts', new mongoose.Schema({}, {
    strict: false,
    versionKey: false
  }));

  const messages = connSecond.model('users', Any.schema);
  const filter = {};

  if (onlyMe === 1) {
    filter.username = {$in: [DEV_USERNAME]};
  }

  const cursor = messages.find(filter)
    .cursor();

  let updates = [],
    document;

  while ((document = await cursor.next())) {
    const {id} = document.toObject();
    updates.push({
      insertOne: {
        document: {
          _id: new mongoose.Types.ObjectId(),
          uid: id,
          cId
        }
      },
    });

    if (updates.length % 1000 === 0) {
      console.log(`updates added ${updates.length}`);
      await model.bulkWrite(updates);
      updates = [];
    }
  }

  if (updates.length) {
    console.log(`updates added ${updates.length}`);
    await model.bulkWrite(updates);
  }

  const updFilter = {
    cId,
    sent: {$exists: false}
  };
  const cnt = await model.countDocuments(updFilter);
  ctx.reply(`broad ${cId} created: ${cnt}`);

  return connSecond.close();
};

/** @type BotHelper */
const startBroadcast = async (ctx, txtParam, botHelper) => {
  const [cId, mId, fromId, isChannel] = getCmdParams(txtParam);
  if (!cId) {
    return ctx.reply('broad err no id');
  }
  let preMessage = botHelper.getMidMessage(mId);
  // logger('cId ' + cId)
  // logger('Mid ' + mId)
  // logger('fromId ' + fromId)
  // logger('isChannel ' + isChannel)
  // logger('preMessage ' + preMessage)
  const result = {
    err: 0,
    success: 0,
  };
  const connBroad = createConnection(MONGO_URI_BROAD);

  const model = connBroad.model('broadcasts', Any.schema);

  const filter = {
    sent: {$exists: false},
    cId,
  };

  const cursor = model.find(filter)
    .limit(800)
    .cursor();

  let breakProcess = false;

  await processRows(cursor, 5, 500, async items => {
    if (breakProcess) {
      return;
    }
    const success = [];
    try {
      for (let i = 0; i < items.length; i += 1) {
        if (breakProcess) break;

        const {
          _id,
          uid: id
        } = items[i];

        const runCmd = () => botHelper.forwardMes(mId, fromId * (isChannel ? -1 : 1), id);
        const preCmd = !preMessage ? false : (() => botHelper.sendAdmin(preMessage, id));

        try {
          if (preCmd) {
            logger('run preCmd');
            await preCmd();
          }
          logger('runCmd');
          await runCmd();

          success.push({
            updateOne: {
              filter: {_id},
              update: {sent: true},
            },
          });
          result.success += 1;
        } catch (e) {
          logger(e);
          if (e.code !== 'ETIMEDOUT') {
            if (e.code === 429) {
              breakProcess = JSON.stringify(e);
            }
            result.err += 1;
            success.push({
              updateOne: {
                filter: {_id},
                update: {
                  sent: true,
                  error: JSON.stringify(e),
                  code: e.code,
                },
              },
            });
          }
        }
      }
    } catch (e) {
      logger(e);
      if (e.code === 429) {
        if (e.response.parameters) {
          logger(e.response.parameters.retry_after);
        }
        breakProcess = JSON.stringify(e);
      }
    }
    if (success.length) {
      await model.bulkWrite(success);
    }
  });
  const r = `${JSON.stringify(result)}`;
  const cntSent = await model.countDocuments({
    cId,
    sent: true
  });
  const cntTotal = await model.countDocuments({cId});

  let log = `${cntTotal}/${cntSent}`;

  if (cntTotal && cntTotal === cntSent) {
    const cntActive = await model.countDocuments({
      cId,
      error: {$exists: false}
    });
    log += `/${cntActive}`;
    botHelper.toggleConfig({
      text: 'broadcast',
      chat: ctx.message.chat
    }, false);
  }
  await connBroad.close();

  return ctx.reply(`broad completed: ${r} with ${breakProcess || ''} ${log}`)
    .catch(e => {
      logger(e);
    });
};

/** @type BotHelper */
const processBroadcast = async (txtParam, ctx, botHelper) => {
  let txt = txtParam;
  if (txt.match(cBroad)) {
    ctx.reply('broad new started');
    return createBroadcast(ctx, txt);
  }
  if (txt.match(sBroad)) {
    txt = txt.replace(sBroad, '');
    ctx.reply('broad send started');
    return startBroadcast(ctx, txt, botHelper);
  }
  return Promise.resolve();
};

/**
 * @param ctx
 * @param botHelper
 * @type BotHelper
 * */
const broadcast = (ctx, botHelper) => {
  const {
    chat: {id: chatId},
    text,
  } = ctx.message;
  if (!botHelper.isAdmin(chatId) || !text) {
    return;
  }

  processBroadcast(text, ctx, botHelper);
};

exports.broadcast = broadcast;
