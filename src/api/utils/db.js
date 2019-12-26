const Any = require('../models/any.model');

const links = Any.collection.conn.model('links', Any.schema);

const stat = async () => {
  const cnt = await links.countDocuments();
  return cnt;
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

module.exports.stat = stat;
module.exports.updateOne = updateOne;
module.exports.get = get;
