const schema = require('../models/schema');

const {
  MONGO_URI_OLD,
  MONGO_URI_OLD_2,
  MONGO_COLL_LINKS,
  MONGO_COLL_I_LINKS,
} = require('../../config/vars');
const {createConnection} = require('../../config/mongoose');
const {model} = require('mongoose');
const {logger} = require('./logger');
const {dbKeys} = require("../../config/consts");
const schemaUpd = require("../models/schemaUpdatedAt");

const LINKS_COLL = MONGO_COLL_LINKS || 'links';
const I_LINKS_COLL = MONGO_COLL_I_LINKS || 'ilinks';

const links = model(LINKS_COLL, schema);
const inlineLinks = model(I_LINKS_COLL, schema);
const counter = model('counter', schemaUpd);
const conn0 = createConnection(MONGO_URI_OLD);
const conn1 = createConnection(MONGO_URI_OLD_2);

const linksOld1 = conn0 && conn0.model(LINKS_COLL, schema);
const inlineOld1 = conn0 && conn0.model(I_LINKS_COLL, schema);

const linksOld2 = conn1 && conn1.model(LINKS_COLL, schema);
const inlineOld2 = conn1 && conn1.model(I_LINKS_COLL, schema);

const stat = () => links.countDocuments();

const clearFromCollection = async msg => {
  const {text} = msg;

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

const removeInline = url => inlineLinks.deleteMany({url});

const updateOneLink = (item, collection = links) => {
  const {url} = item;

  if (item && item.iv) {
    item.$inc = {af: 1};
  }

  return collection.updateOne({url}, item, {upsert: true});
};

const getFromCollection = async (url, coll, insert = true) => {
  const me = await coll.findOne({url});
  if (insert || me) {
    await updateOneLink({url}, coll);
  }

  return me;
};

const getInline = async url => {
  // check from old DB without insert
  let me;
  if (inlineOld1) {
    me = await getFromCollection(url, inlineOld1, false);
    if (me) {
      logger('link from Old1 db')
    }
  }
  if (!me && inlineOld2) {
    me = await getFromCollection(url, inlineOld2, false);
    if (me) {
      logger('link from Old2 db')
    }
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
    if (me) {
      logger('link from Old1 db')
    }
  }
  if (!me && linksOld2) {
    me = await getFromCollection(url, linksOld2, false);
    if (me) {
      logger('link from Old2 db')
    }
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
const get = (params) => getCol(params.key).findOne(params.filter, params.project || {});

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

const getCol = (key) => {
  if (key === dbKeys.counter) return counter;
}

const getLastCreatedLinks = async (limit = 10) => {
  const docs = await links.find({}).sort({ createdAt: -1 }).limit(limit);
  if (docs.length === 0) {
    return 'Список созданных ссылок пуст.';
  }
  let msg = `📅 *Последние ${docs.length} созданных ссылок:*\n\n`;
  docs.forEach((doc, i) => {
    const dateStr = doc.createdAt
      ? new Date(doc.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' MSK'
      : 'нет даты';
    const url = doc.url || 'нет URL';
    msg += `${i + 1}. [${url}](${url}) (${dateStr})\n`;
  });
  return msg;
};

const getDbSizeStats = async (aaa_db='') => {
    console.log('aaa_db')
    console.log(aaa_db)
  const mongoose = require('mongoose');
  let conn = mongoose.connection;
  if (aaa_db === '0') conn = conn0
  if (aaa_db === '1') conn = conn1
  if (!conn || !conn.db) {
    return 'Нет активного подключения к БД';
  }
  try {
    const dbStatsRes = await conn.db.command({ dbStats: 1 });
    const linksStats = await conn.db.command({ collStats: LINKS_COLL });
    const ilinksStats = await conn.db.command({ collStats: I_LINKS_COLL });

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    let response = `📊 *Статистика базы данных MongoDB:*\n\n`;
    response += `*База данных:* \`${dbStatsRes.db}\`\n`;
    response += `• Объем данных (dataSize): ${formatBytes(dbStatsRes.dataSize)}\n`;
    response += `• Объем на диске (storageSize): ${formatBytes(dbStatsRes.storageSize)}\n`;
    response += `• Объем индексов (indexSize): ${formatBytes(dbStatsRes.indexSize)}\n`;
    response += `• Количество коллекций: ${dbStatsRes.collections}\n`;
    response += `• Количество объектов: ${dbStatsRes.objects}\n\n`;

    response += `📦 *Коллекция ${LINKS_COLL}:*\n`;
    response += `• Документов: ${linksStats.count}\n`;
    response += `• Объем (size): ${formatBytes(linksStats.size)}\n`;
    response += `• Объем на диске (storageSize): ${formatBytes(linksStats.storageSize)}\n\n`;

    response += `📦 *Коллекция ${I_LINKS_COLL}:*\n`;
    response += `• Документов: ${ilinksStats.count}\n`;
    response += `• Объем (size): ${formatBytes(ilinksStats.size)}\n`;
    response += `• Объем на диске (storageSize): ${formatBytes(ilinksStats.storageSize)}\n`;

    return response;
  } catch (e) {
    logger(`Error fetching DB stats: ${e}`);
    return `Ошибка получения статистики: ${e.message || e}`;
  }
};

const reactivateUser = async (chatId) => {
  return
  const { MONGO_URI_SECOND } = require('../../config/vars');
  if (!MONGO_URI_SECOND || !chatId) return;

  try {
    const { createConnection } = require('../../config/mongoose');
    const connSecond = createConnection(MONGO_URI_SECOND);
    if (connSecond) {
      await new Promise((resolve, reject) => {
        connSecond.once('open', resolve);
        connSecond.once('error', reject);
      }).catch(() => {});

      const schema = require('../models/schema');
      const usersModel = connSecond.model('users', schema);

      const result = await usersModel.updateOne(
        { $or: [{ id: chatId }, { uid: chatId }] },
        { $set: { blocked: false } }
      );

      if (result.modifiedCount > 0) {
        console.log(`[REACTIVATION] User ${chatId} automatically reactivated!`);
      }

      await connSecond.close();
    }
  } catch (err) {
    console.error(`[REACTIVATION ERROR] Failed to reactivate user ${chatId}:`, err);
  }
};

module.exports.stat = stat;
module.exports.clearFromCollection = clearFromCollection;
module.exports.updateOneLink = updateOneLink;
module.exports.removeInline = removeInline;
module.exports.getInline = getInline;
module.exports.getIV = getIV;
module.exports.checkTimeFromLast = checkTimeFromLast;
module.exports.getCleanData = getCleanData;
module.exports.getCol = getCol;
module.exports.get = get;
module.exports.getLastCreatedLinks = getLastCreatedLinks;
module.exports.getDbSizeStats = getDbSizeStats;
module.exports.reactivateUser = reactivateUser;


