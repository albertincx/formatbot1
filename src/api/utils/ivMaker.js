const Mercury = require('@postlight/mercury-parser');
const fetch = require('node-fetch');
const sanitizeHtml = require('sanitize-html');

const makeTelegaph = require('./makeTelegaph');
const logger = require('./logger');
const mercury = require('./mercury');
const ParseHelper = require('./parseHelper');
const db = require('./db');

const parse = async (userUrl, paramsObj) => {
  const parseHelper = new ParseHelper(userUrl, paramsObj);
  userUrl = parseHelper.link;
  const opts = {};
  if (parseHelper.custom) {
    const html = await parseHelper.fetchHtml();
    logger(html, 'fixedFetched.html');
    opts.html = Buffer.from(html);
  }
  const extractor = parseHelper.getExtractor();
  if (extractor) {
    Mercury.addExtractor(extractor);
  }
  let result = await mercury(userUrl, opts);
  logger(result.content, 'mercury.html');
  let { content } = result;
  const preContent = sanitizeHtml(content).trim();
  logger(preContent, 'preContent.html');
  if (preContent.length === 0) {
    const html = await parseHelper.puppet(userUrl);
    if (html) {
      logger(html, 'asyncContent.html');
      result = await mercury(userUrl, { html: Buffer.from(html) });
      logger(result.content, 'mercuryAsyncContent.html');
    }
  }
  let { title = '', url: source, iframe } = result;
  logger(iframe, 'iframes.html');
  if (parseHelper.title) title = parseHelper.title;
  content = result.content;
  if (content && preContent) {
    logger(content, 'mercury.html');
    content = await parseHelper.fixHtml(content, iframe);
    content = parseHelper.fixImages(content);
    logger(content, 'tg_content.html');
    logger(`after san ${content.length}`);
  }
  title = title && title.trim();
  title = title || 'Untitled article';
  const res = {
    title,
    content,
    source,
  };

  return res;
};

const makeIvLink = async (url, paramsObj) => {
  const exist = await db.get(url);
  if (exist) {
    return exist;
  }

  url = toUrl(url);
  const { access_token, ...params } = paramsObj;
  const authorUrl = `${url}`;
  const { title, content } = await parse(url, params);
  if (!content) throw 'empty content';
  const obj = { title, access_token };
  if (authorUrl.length <= 255) {
    obj.author_url = authorUrl;
  }
  const tgRes = await makeTelegaph(obj, content);
  const { telegraphLink, isLong, pages, push } = tgRes;
  if (!telegraphLink) throw 'empty ivlink';
  const res = { iv: telegraphLink, isLong, pages, push };
  await db.updateOne({ url, ...res });

  return res;
};

const toUrl = (url) => {
  if (!url.match(/^(https?|ftp|file)/)) return `http://${url}`;
  return url;
};

const isText = async (u) => {
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
