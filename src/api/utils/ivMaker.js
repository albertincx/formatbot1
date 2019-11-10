const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');

const makeTelegaph = require('./makeTelegaph');
const sanitizeHtmlForce = require('./sanitize');
const logger = require('./logger');
const imgFixer = require('./fixImages');
const FixHtml = require('./fixHtml');

const parse = async (userUrl) => {
  const htmlFixer = new FixHtml(userUrl);
  const baseUrl = htmlFixer.websiteUrl;

  let result = {};
  const opts = {};
  if (htmlFixer.checkCustom()) {
    const html = await htmlFixer.fetchHtml();
    logger(html, 'fixedFetched.html');
    opts.html = Buffer.from(html);
  }
  const extractor = htmlFixer.getExtracktor();
  if (extractor) Mercury.addExtractor(extractor);
  try {
    result = await Mercury.parse(userUrl, opts);
  } catch (e) {
    throw new Error('Mercury didnt');
  }
  let { title, content, url: source, iframe } = result;
  if (content) {
    logger(content, 'mercury.html');
    const imgs = imgFixer.findImages(content);
    content = imgFixer.replaceImages(content, imgs);
    logger(`before san ${content.length}`);
    content = sanitizeHtml(content);
    content = sanitizeHtmlForce(content);
    content = imgFixer.restoreImages(content, imgs, baseUrl);
    if (iframe && Array.isArray(iframe)) {
      content = imgFixer.insertYoutube(content, iframe);
    }
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
const makeIvLink = async (url) => {
  const { title, content, source } = await parse(url);
  if (!content) throw 'empty content';
  const obj = {
    title,
    author_url: url,
  };
  const { telegraphLink, isLong } = await makeTelegaph(obj, content);
  if (!telegraphLink) throw 'empty ivlink';
  return {
    iv: telegraphLink,
    source,
    isLong,
  };
};
exports.makeIvLink = makeIvLink;
