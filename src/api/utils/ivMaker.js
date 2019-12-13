const Mercury = require('@postlight/mercury-parser');
const fetch = require('node-fetch');
const sanitizeHtml = require('sanitize-html');

const makeTelegaph = require('./makeTelegaph');
const logger = require('./logger');
const mercury = require('./mercury');
const ParseHelper = require('./parseHelper');
const puppet = require('./puppet');

const parse = async (userUrl, browserWs, params) => {
  const parseHelper = new ParseHelper(userUrl);
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
  if (browserWs && preContent.length === 0) {
    //try to puppeteer
    logger(browserWs);
    const html = await puppet(userUrl, browserWs);
    logger(html, 'asyncContent.html');
    if (html) {
      result = await mercury(userUrl, { html: Buffer.from(html) });
      logger(result.content, 'mercuryAsyncContent.html');
    }
  }
  let { title, url: source, iframe } = result;
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
  title = title || userUrl || 'Untitled article';
  const res = {
    title,
    content,
    source,
  };

  return res;
};

const makeIvLink = async (url, browserWs, paramsObj) => {
  url = toUrl(url);
  const { access_token, ...params } = paramsObj;
  const authorUrl = `${url}`;
  const { title, content } = await parse(url, browserWs, params);
  if (!content) throw 'empty content';
  const obj = { title, access_token };
  if (authorUrl.length <= 255) {
    obj.author_url = authorUrl;
  }
  const tgRes = await makeTelegaph(obj, content);
  const { telegraphLink, isLong, pages, push } = tgRes;
  if (!telegraphLink) throw 'empty ivlink';
  return {
    iv: telegraphLink,
    isLong,
    pages,
    push,
  };
};

const toUrl = (url) => {
  if (!url.match(/^(https?|ftp|file)/)) return `http://${url}`;
  return url;
};

const isText = async (url) => {
  url = toUrl(url);
  const { url: baseUrl, headers } = await fetch(url, { timeout: 5000 });
  const contentType = headers.get('content-type') || '';
  logger(contentType);
  const isText = contentType.startsWith('text/');
  return { isText, url: baseUrl };
};

exports.isText = isText;
exports.makeIvLink = makeIvLink;
