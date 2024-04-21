const {
  IS_DEV,
  MONGO_URI_SECOND
} = require('../../config/vars');
const Any = require('../models/any.model');
const {createConnection} = require('../../config/mongoose');
const co = require('co');
const {logger} = require('./logger');

const cBroad = '/createBroadcast';
const sBroad = '/startBroadcast';

const processRows = async (cc, limit = 25, timeout, cb) => {
  let items = [];
  if (!cb) {
    return;
  }
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
  const [cId] = getCmdParams(txt);
  if (!cId) {
    return ctx.reply('broad completed no id');
  }
  const connSecond = createConnection(MONGO_URI_SECOND);
  const model = Any.collection.conn.model('broadcasts', Any.schema);
  const messages = connSecond.model('messages', Any.schema);
  const filter = {};
  if (IS_DEV) {
    filter.username = {$in: ['safiullin']};
  }
  // filter.username = {$in: ['safiullin']};
  // await model.updateMany(
  //   {cId: 10, error: /:429/},
  //   {$unset: {sent: '', error: ''}},
  // );
  /* await model.updateMany({ cId: 10, code: 403 },
    { $unset: { sent: '', error: '', code:'' } }); */

  const cursor = messages.find(filter)
    .cursor();

  const updFilter = {
    cId,
    sent: {$exists: false}
  };

  await processRows(cursor, 500, 10, items => {
    const updates = [];

    items.forEach(({id}) => {
      updates.push({
        updateOne: {
          filter: {
            ...updFilter,
            id
          },
          update: {
            id,
            cId
          },
          upsert: true,
        },
      });
    });
    return updates.length ? model.bulkWrite(updates) : null;
  });
  const cnt = await model.countDocuments(updFilter);
  ctx.reply('broad completed: ' + cnt);
  return connSecond.close();
};

/** @type BotHelper */
const startBroadcast = async (ctx, txtParam, bot) => {
  const [cId, Mid, FromId, isChannel, SecondMid] = getCmdParams(txtParam);
  if (!cId) {
    return ctx.reply('broad completed no id');
  }
  let newMid = txtParam.replace(/(\s|_)?r_c_id_(.*?)\s/, '');
  // logger(newMid);
  // logger('cId ' + cId)
  // logger('Mid ' + Mid)
  // logger('FromId ' + FromId)
  // logger('isChannel ' + isChannel)
  // logger('SecondMid ' + SecondMid)
  const result = {
    err: 0,
    success: 0,
  };
  let connSecond;

  if (IS_DEV) {
    // connSecond = connectDb();
  }

  const model = Any.collection.conn.model('broadcasts', Any.schema);

  // DEV
  // const model = isDEV && connSecond.model('broadcasts', Any.schema);

  const filter = {
    sent: {$exists: false},
    cId,
  };
  const sendCmd = Mid ? 'forwardMes' : 'sendAdmin';
  logger(sendCmd);
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
        if (breakProcess) {
          break;
        }
        const {
          _id,
          id
        } = items[i];
        let runCmd;
        if (Mid) {
          runCmd = () => bot[sendCmd](Mid, FromId * (isChannel ? -1 : 1), id);
        } else {
          runCmd = () => bot[sendCmd](newMid, id);
        }
        try {
          logger('runCmd');
          await runCmd();
          if (SecondMid) {
            const runCmd2 = () =>
              bot[sendCmd](SecondMid, FromId * (isChannel ? -1 : 1), id);
            await runCmd2();
          }
          success.push({
            updateOne: {
              filter: {_id},
              update: {sent: true},
            },
          });
          result.success += 1;
        } catch (e) {
          logger(e)
          logger('e.code ' + e.code)
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
      logger(e)
      if (
        e.code === 429 &&
        e.response.parameters &&
        e.response.parameters.retry_after
      ) {
        logger(e.response.parameters.retry_after);
        // await timeout(e.response.parameters.retry_after);
      }
      if (e.code === 429) {
        breakProcess = JSON.stringify(e);
      }
    }
    if (success.length) {
      await model.bulkWrite(success);
    }
  });
  const r = `${JSON.stringify(result)}`;
  if (connSecond) {
    await connSecond.close();
  }

  return ctx.reply(`broad completed: ${r} with ${breakProcess || ''}`).catch(e => {
    logger(e)
  });
};

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
