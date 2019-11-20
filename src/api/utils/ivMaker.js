const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');

const makeTelegaph = require('./makeTelegaph');
const logger = require('./logger');
const imgFixer = require('./fixImages');
const mercury = require('./mercury');
const ParseHelper = require('./parseHelper');
const puppet = require('./puppet');

const parse = async (userUrl, browserWs) => {
  const parseHelper = new ParseHelper(userUrl);
  const opts = {};
  if (parseHelper.checkCustom()) {
    const html = await parseHelper.fetchHtml();
    logger(html, 'fixedFetched.html');
    opts.html = Buffer.from(html);
  }

  let result = await mercury(userUrl, opts);
  logger(result.content, 'mercury.html');
  const extractor = parseHelper.getExtractor();
  //console.log(extractor);
  if (extractor) Mercury.addExtractor(extractor);
  let { content } = result;
  const preContent = sanitizeHtml(content)
    .trim();
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
  if (parseHelper.title) title = parseHelper.title;
  content = result.content;
  if (content && preContent) {
    logger(content, 'mercury.html');
    content = imgFixer.fixHtml(content, iframe, parseHelper.websiteUrl);
    logger(content, 'tg_content.html');
    logger(`after san ${content.length}`);
  }
  const res = {
    title: title || userUrl,
    content,
    source,
  };

  return res;
};

const makeIvLink = async (url, browserWs) => {
  const { title, content, source } = await parse(url, browserWs);
  if (!content) throw 'empty content';
  const obj = {
    title,
    author_url: url,
  };
  const { telegraphLink, isLong, pages, push } = await makeTelegaph(obj, content);
  if (!telegraphLink) throw 'empty ivlink';
  return {
    iv: telegraphLink,
    source,
    isLong,
    pages,
    push,
  };
};
exports.makeIvLink = makeIvLink;
