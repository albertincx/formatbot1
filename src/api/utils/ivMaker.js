const fetch = require('node-fetch');
const makeTelegaph = require('./makeTelegaph');
const logger = require('./logger');
const ParseHelper = require('./parseHelper');
const db = require('./db');

const makeIvLink = async (url, paramsObj) => {
  if (paramsObj.db) {
    const exist = await db.get(url);
    if (exist) {
      logger('from db');
      exist.isLong = exist.pages;
      return exist;
    }
  }

  url = toUrl(url);
  const { access_token, ...params } = paramsObj;
  const authorUrl = `${url}`;
  const parseHelper = new ParseHelper(url, params);
  const { title, content } = await parseHelper.parse();
  if (!content) throw 'empty content';
  const obj = { title, access_token };
  if (authorUrl.length <= 255) {
    obj.author_url = authorUrl;
  }
  const tgRes = await makeTelegaph(obj, content);
  const { telegraphLink, isLong, pages, push } = tgRes;
  if (!telegraphLink) throw 'empty ivlink';
  const res = { iv: telegraphLink, pages, push, title };

  if (paramsObj.db) {
    await db.updateOne({ url, ...res });
  }

  res.isLong = res.pages;
  return res;
};

const toUrl = (url) => {
  if (!url.match(/^(https?|ftp|file)/)) return `http://${url}`;
  return url;
};

const isText = async (u, q) => {
  if (q && q.match('cached')) {
    logger('cached is text = true');
    return { isText: true, url: u };
  }
  u = toUrl(u);
  const r = await fetch(u, { timeout: 5000 });
  const { url, headers } = r;
  const contentType = headers.get('content-type') || '';
  logger(contentType);
  const isText = contentType.startsWith('text/');
  return { isText, url };
};

exports.isText = isText;
exports.makeIvLink = makeIvLink;
