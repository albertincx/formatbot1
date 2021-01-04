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

const makeIvLinkFromContent = async (file, paramsObj) => {
  const {access_token: accessToken, ...params} = paramsObj;
  const authorUrl = 'from File';
  const parseHelper = new ParseHelper('', params);
  let {content} = file;
  const title = file.file_name;
  if (file.isHtml) {
    content = await parseHelper.parseContent(content);
  } else {
    content = `<div>${content}</div>`;
  }
  if (!content) {
    throw new Error('empty content');
  }
  const obj = {title, access_token: accessToken, authorUrl};
  const tgRes = await makeTelegaph(obj, content);
  const {telegraphLink, pages, push} = tgRes;
  if (!telegraphLink) {
    throw new Error('empty ivlink');
  }
  const res = {
    iv: telegraphLink,
    pages,
    push,
    title,
  };
  res.isLong = res.pages;
  return res;
};

const makeIvLink = async (urlParam, paramsObj) => {
  if (paramsObj.db) {
    const exist = await db.get(urlParam);
    if (exist) {
      logger('from db');
      exist.isLong = exist.pages;
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
  const {telegraphLink, pages, push} = tgRes;
  if (!telegraphLink) {
    throw new Error('empty ivlink');
  }
  const res = {
    iv: telegraphLink,
    pages,
    push,
    title,
  };

  if (paramsObj.db) {
    await db.updateOne({url, ...res});
  }

  res.isLong = res.pages;
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
  const r = await fetch(u, {timeout: 5000, headers: headersCheck});
  const {url, headers} = r;
  const contentType = headers.get('content-type') || '';
  logger(contentType);
  const startsText = contentType.startsWith('text/');
  return {isText: startsText, url};
};

exports.parse = parse;
exports.isText = isText;
exports.makeIvLink = makeIvLink;
exports.makeIvLinkFromContent = makeIvLinkFromContent;
