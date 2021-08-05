const fetch = require('node-fetch');

const makeTelegaph = require('./makeTelegaph');
const logger = require('./logger');
const ParseHelper = require('./parseHelper');
const db = require('./db');

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:21.0) Gecko/20100101 Firefox/21.0';

function from64(v) {
  return Buffer.from(v, 'base64');
}

const G = from64('bmV3cy5nb29nbGUuY29t');

const makeIvLink = async (urlParam, paramsObj) => {
  if (paramsObj.db) {
    const exist = await db.get(urlParam);
    if (exist) {
      logger('from db');
      exist.isLong = exist.p;
      return exist;
    }
  }

  const url = toUrl(urlParam);
  const {access_token: accessToken, ...params} = paramsObj;
  const authorUrl = `${url}`;
  const parseHelper = new ParseHelper(url, params);
  const {title, content} = await parseHelper.parse();
  if (!content) {
    throw new Error('empty content');
  }
  const obj = {title, access_token: accessToken};
  if (authorUrl.length <= 255) {
    obj.author_url = authorUrl;
  }
  const tgRes = await makeTelegaph(obj, content);
  const {telegraphLink, pages} = tgRes;
  if (!telegraphLink) {
    throw new Error('empty ivlink');
  }
  const res = {
    iv: telegraphLink,
    ti: title,
  };
  if (pages) {
    res.p = pages;
  }
  if (paramsObj.db) {
    await db.updateOne({url, ...res});
  }

  res.isLong = res.p;
  return res;
};

const toUrl = url => {
  if (!url.match(/^(https?|ftp|file)/)) return `http://${url}`;
  return url;
};

const parse = u => {
  if (u.match(G)) {
    let p = u.split(/es\/(.*?)\?/);
    if (p) {
      p = from64(p[1]).toString();
      // eslint-disable-next-line no-control-regex
      p = p.match(/^\x08\x13".(.*)\//);
      return p[1];
    }
  }
  return u;
};

const isText = async (urlParam, q) => {
  if (q && q.match('cached')) {
    logger('cached is text = true');
    return {isText: true, url: urlParam};
  }
  let u = toUrl(urlParam);
  if (!u.match('%')) {
    u = encodeURI(u);
  }
  const headersCheck = {
    Accept: 'text/html',
    'user-agent': USER_AGENT,
  };
  let startsText = false;
  let url = '';
  try {
    const r = await fetch(u, {timeout: 5000, headers: headersCheck});
    const {url: newUrl, headers} = r;
    url = newUrl;
    const contentType = headers.get('content-type') || '';
    logger(contentType);
    startsText = contentType.startsWith('text/');
  } catch (e) {
    //
  }
  return {isText: startsText, url};
};

exports.parse = parse;
exports.isText = isText;
exports.makeIvLink = makeIvLink;
