const co = require('co');
const mongoose = require('mongoose');
const Any = require('../models/any.model');

const connectDb = () =>
  mongoose.createConnection(process.env.MONGO_URI_SECOND, {
    keepAlive: 1,
    connectTimeoutMS: 30000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

const links = Any.collection.conn.model(
  process.env.MONGO_COLL_LINKS || 'links',
  Any.schema,
);
const inlineLinks = Any.collection.conn.model(
  process.env.MONGO_COLL_ILINKS || 'ilinks',
  Any.schema,
);
const logs = Any.collection.conn.model(
  process.env.MONGO_COLL_LOGS || 'logs',
  Any.schema,
);
const stat = () => links.countDocuments();

const processRows = async (cc, limit = 25, timeout, cb) => {
  let items = [];
  if (!cb) {
    return;
  }
  // eslint-disable-next-line func-names
  await co(function* () {
    for (let doc = yield cc.next(); doc != null; doc = yield cc.next()) {
      const item = doc.toObject();
      if (items.length === limit) {
        try {
          yield cb(items);
        } catch (e) {
          // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }
};

const cBroad = '/createBroadcast';
const sBroad = '/startBroadcast';

const processBroadcast = async (txtParam, reply, botHelper) => {
  let txt = txtParam;
  if (txt.match(cBroad)) {
    reply('broad new started');
    return createBroadcast(reply, txt);
  }
  if (txt.match(sBroad)) {
    txt = txt.replace(sBroad, '');
    reply('broad send started');
    return startBroadcast(reply, txt, botHelper);
  }
  return Promise.resolve();
};

const getCids = txt => {
  let l = txt.match(/r_c_id_([0-9_-]+)/);
  if (l && l[1]) l = l[1].split('_').map(Number);
  return l || [];
};

const createBroadcast = async (reply, txt) => {
  const [cId] = getCids(txt);
  if (!cId) {
    return reply('broad completed no id');
  }
  const connSecond = connectDb();
  const messages = Any.collection.conn.model('messages', Any.schema);
  const model = connSecond.model('broadcasts', Any.schema);
  const filter = {};
  if (process.env.DEV) {
    filter.username = {$in: ['safiullin']};
  }
  await model.updateMany(
    {cId: 10, error: /:429/},
    {$unset: {sent: '', error: ''}},
  );
  /* await model.updateMany({ cId: 10, code: 403 },
    { $unset: { sent: '', error: '', code:'' } }); */
  const cursor = messages.find(filter).cursor();
  await processRows(cursor, 500, 10, items => {
    const updates = [];
    // eslint-disable-next-line no-unused-vars
    items.forEach(({_id, ...it}) => {
      updates.push({
        updateOne: {
          filter: {id: it.id, cId, sent: {$exists: false}},
          update: {...it, cId},
          upsert: true,
        },
      });
    });
    return updates.length ? model.bulkWrite(updates) : null;
  });
  reply('broad completed');
  return connSecond.close();
};

const startBroadcast = async (reply, txtParam, bot) => {
  let txt = txtParam;
  const [cId, Mid, FromId] = getCids(txt);
  if (!cId) {
    return reply('broad completed no id');
  }
  txt = txt.replace(/\sr_c_id_(.*?)\s/, '');
  const result = {err: 0, success: 0};
  let model;
  let connSecond;

  if (process.env.DEV) {
    connSecond = connectDb();
    model = connSecond.model('broadcasts', Any.schema);
  } else {
    model = Any.collection.conn.model('broadcasts', Any.schema);
  }

  const filter = {sent: {$exists: false}, cId};
  const sendCmd = Mid ? 'forward' : 'sendAdmin';
  const cursor = model.find(filter).limit(800).cursor();
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
        const {_id, id} = items[i];
        let runCmd;
        if (Mid) {
          runCmd = () => bot[sendCmd](Mid, FromId, id);
        } else {
          runCmd = () => bot[sendCmd](txt, id);
        }
        try {
          // eslint-disable-next-line no-await-in-loop
          await runCmd();
          success.push({
            updateOne: {
              filter: {_id},
              update: {sent: true},
            },
          });
          result.success += 1;
        } catch (e) {
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
    } catch (e) {
      if (
        e.code === 429 &&
        e.response.parameters &&
        e.response.parameters.retry_after
      ) {
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
  return reply(`broad completed: ${r} with ${breakProcess || ''}`);
};

const clear = async msg => {
  let search = msg.text.replace('/cleardb', '').trim();
  search = `${search}`.trim();
  if (!search) {
    return Promise.resolve('empty');
  }
  const s = new RegExp(`^https?://${search}`);
  const d = await links.deleteMany({url: s});
  return JSON.stringify(d);
};

const removeInline = url => inlineLinks.deleteMany({url});

const getInine = async url => {
  const exists = await inlineLinks.findOne({url});
  await updateOne({url}, inlineLinks);
  return exists;
};

const get = async url => {
  const me = await links.findOne({url});
  if (me) {
    await updateOne({url});
    return me.toObject();
  }
  return false;
};

const updateOne = async (item, collection = links) => {
  const {url} = item;
  // eslint-disable-next-line no-param-reassign
  item.$inc = {affects: 1};
  return collection.updateOne({url}, item, {upsert: true});
};
const log = async item => {
  const {url} = item;
  // eslint-disable-next-line no-param-reassign
  item.$inc = {affects: 1};
  return logs.updateOne({url}, item, {upsert: true});
};

module.exports.stat = stat;
module.exports.clear = clear;
module.exports.updateOne = updateOne;
module.exports.removeInline = removeInline;
module.exports.getInine = getInine;
module.exports.get = get;
module.exports.log = log;
module.exports.createBroadcast = createBroadcast;
module.exports.startBroadcast = startBroadcast;
module.exports.processBroadcast = processBroadcast;
