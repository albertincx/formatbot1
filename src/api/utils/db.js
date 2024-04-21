const Any = require('../models/any.model');

const {
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
module.exports.checkTimeFromLast = checkTimeFromLast;
module.exports.getCleanData = getCleanData;
