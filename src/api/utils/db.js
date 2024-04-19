const co = require('co');
const Any = require('../models/any.model');

const {
  IS_DEV,
  MONGO_URI_SECOND,
  MONGO_URI_OLD,
  MONGO_COLL_LINKS,
  MONGO_COLL_I_LINKS,
} = require('../../config/vars');
const {createConnection} = require('../../config/mongoose');

const LINKS_COLL = MONGO_COLL_LINKS || 'links';
const I_LINKS_COLL = MONGO_COLL_I_LINKS || 'ilinks';

const links = Any.collection.conn.model(LINKS_COLL, Any.schema);
const inlineLinks = Any.collection.conn.model(I_LINKS_COLL, Any.schema);

const conn2 = createConnection(MONGO_URI_OLD);

const linksOld1 = conn2 && conn2.model(LINKS_COLL, Any.schema);
const inlineLinksOld1 = conn2 && conn2.model(I_LINKS_COLL, Any.schema);

const stat = () => links.countDocuments();

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

const cBroad = '/createBroadcast';
const sBroad = '/startBroadcast';

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

const getCids = txt => {
  let l = txt.match(/r_c_id_([0-9_-]+)/);
  if (l && l[1]) {
    l = l[1].split('_')
      .map(Number);
  }
  return l || [];
};

const createBroadcast = async (ctx, txt) => {
  const [cId] = getCids(txt);
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
  await processRows(cursor, 500, 10, items => {
    const updates = [];

    const updFilter = {
      cId,
      sent: {$exists: false}
    };

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
  ctx.reply('broad completed');
  return connSecond.close();
};

const startBroadcast = async (ctx, txtParam, bot) => {
  const [cId, Mid, FromId, isChannel, SecondMid] = getCids(txtParam);
  if (!cId) {
    return ctx.reply('broad completed no id');
  }
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
  const sendCmd = Mid ? 'forward' : 'sendAdmin';
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
          runCmd = () =>
            bot[sendCmd](txtParam.replace(/(\s|_)?r_c_id_(.*?)\s/, ''), id);
        }
        try {
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

  return ctx.reply(`broad completed: ${r} with ${breakProcess || ''}`);
};

const clear = async msg => {
  const {text} = msg;

  if (text.match(/^\/cleardb2/)) {
    return clear2(msg);
  }
  let search;

  if (text.match(/^\/cleardb3_/)) {
    search = text.replace('/cleardb3_', '')
      .replace(/_/g, '.');
  } else {
    search = text.replace('/cleardb', '')
      .trim();
  }
  if (!search) {
    return Promise.resolve('empty');
  }
  const s = new RegExp(`^https?://${search}`);
  const d = await links.deleteMany({url: s});
  return JSON.stringify(d);
};

const clear2 = async msg => {
  let search = msg.text.replace('/cleardb2', '')
    .trim();
  search = `${search}`.trim();
  if (!search) {
    return Promise.resolve('empty');
  }
  const s = new RegExp(`^https?://${search}`);
  const d = await linksOld1.deleteMany({url: s});
  return JSON.stringify(d);
};
// linksOld1
const removeInline = url => inlineLinks.deleteMany({url});

const updateOne = (item, collection = links) => {
  const {url} = item;
  item.$inc = {af: 1};
  return collection.updateOne({url}, item, {upsert: true});
};

const getFromCollection = async (url, coll, insert = true) => {
  const me = await coll.findOne({url});
  if (insert || me) {
    await updateOne({url}, coll);
  }
  return me;
};

const getInline = async url => {
  // check from old DB without insert
  let me;
  if (inlineLinksOld1) {
    me = await getFromCollection(url, inlineLinksOld1, false);
  }
  if (!me) {
    me = await getFromCollection(url, inlineLinks);
  }
  return me;
};

const getIV = async url => {
  // check from old DB without insert
  let me;
  if (linksOld1) {
    me = await getFromCollection(url, linksOld1, false);
  }
  if (!me) {
    me = await getFromCollection(url, links);
  }
  if (me) {
    return me.toObject();
  }
  return false;
};

const checkTimeFromLast = () => links.findOne({}, {}, {sort: {createdAt: -1}});

const getCleanData = async () => {
  const agg = [
    {
      $addFields: {
        origin: {
          $arrayElemAt: [{$split: ['$url', '/']}, 2],
        },
      },
    },
    {
      $group: {
        _id: '$origin',
        cnt: {
          $sum: 1,
        },
      },
    },
    {
      $match: {
        cnt: {
          $gte: 6000,
        },
      },
    },
  ];
  const result = await links.aggregate(agg);
  // const result2 = await checkTimeFromLast();
  return result.map(i => `${i._id.replace(/\./g, '_')} ${i.cnt}`);
};

module.exports.stat = stat;
module.exports.clear = clear;
module.exports.clear2 = clear2;
module.exports.updateOne = updateOne;
module.exports.removeInline = removeInline;
module.exports.getInline = getInline;
module.exports.getIV = getIV;
module.exports.createBroadcast = createBroadcast;
module.exports.startBroadcast = startBroadcast;
module.exports.processBroadcast = processBroadcast;
module.exports.checkTimeFromLast = checkTimeFromLast;
module.exports.getCleanData = getCleanData;
