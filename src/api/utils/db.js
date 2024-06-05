const schema = require('../models/schema');

const {
  MONGO_URI_OLD,
  MONGO_COLL_LINKS,
  MONGO_COLL_I_LINKS,
} = require('../../config/vars');
const {createConnection} = require('../../config/mongoose');
const {model} = require('mongoose');

const LINKS_COLL = MONGO_COLL_LINKS || 'links';
const I_LINKS_COLL = MONGO_COLL_I_LINKS || 'ilinks';

const links = model(LINKS_COLL, schema);
const inlineLinks = model(I_LINKS_COLL, schema);

const conn2 = createConnection(MONGO_URI_OLD);

const linksOld1 = conn2 && conn2.model(LINKS_COLL, schema);
const inlineLinksOld1 = conn2 && conn2.model(I_LINKS_COLL, schema);

const stat = () => links.countDocuments();

const clear = async msg => {
  const {text} = msg;

  if (text.match(/^\/cleardb2/)) {
    return clear2(msg);
  }

  let search;
  let mon = 1;

  if (text.match(/^\/cleardb3_/)) {
    const months = text.match('mon([0-9])');
    if (months) {
      mon = months[1];
    }
    search = text.replace('/cleardb3_', '');
    search = search.replace(/\s(.*?)$/, '');
    search = search.replace(/_/g, '.');
  } else {
    search = text.replace('/cleardb', '');
    search = search.trim();
  }
  if (!search) {
    return Promise.resolve('empty');
  }

  const searchByDomain = new RegExp(`^https?://${search}`);

  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - mon);

  const dMany = {
    url: searchByDomain,
    createdAt: {$lte: fromDate}
  };
  let d;
  d = await links.deleteMany(dMany);

  return `${JSON.stringify(d)} - ${searchByDomain} - ${JSON.stringify(fromDate)}`;
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

const getCleanData = async (txt) => {
  const nums = txt.match(/[0-9]+/);
  let cnt = 4000;
  if (nums) cnt = +nums[0];

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
          $gte: cnt,
        },
      },
    },
  ];
  const result = await links.aggregate(agg);

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
