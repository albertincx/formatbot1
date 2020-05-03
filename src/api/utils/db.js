const Any = require('../models/any.model');

const links = Any.collection.conn.model(process.env.MONGO_COLL_LINKS || 'links', Any.schema);
const logs = Any.collection.conn.model(process.env.MONGO_COLL_LOGS || 'logs', Any.schema);

const stat = async () => {
  const cnt = await links.countDocuments();
  return cnt;
};

const clear = async (msg) => {
  let search = msg.text.replace('/cleardb', '').trim();
  search = `${search}`.trim();
  if (!search) {
    return Promise.resolve('empty');
  }
  const s = new RegExp(`^https?:\/\/${search}`);
  const d = await links.deleteMany({ url: s });
  return JSON.stringify(d);
};

const get = async (url) => {
  const me = await links.findOne({ url });
  if (me) {
    await updateOne({ url });
    return me.toObject();
  }
  return false;
};

const updateOne = async (item) => {
  const { url } = item;
  item.$inc = { affects: 1 };
  return links.updateOne({ url }, item, { upsert: true });
};
const log = async (item) => {
  const { url } = item;
  item.$inc = { affects: 1 };
  return logs.updateOne({ url }, item, { upsert: true });
};

module.exports.stat = stat;
module.exports.clear = clear;
module.exports.updateOne = updateOne;
module.exports.get = get;
module.exports.log = log;
