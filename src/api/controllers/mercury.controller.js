const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');

const sanitizeHtmlForce = require('../utils/sanitize');
const logger = require('../utils/logger');
const imgFixer = require('../utils/fixImages');
const FixHtml = require('../utils/fixHtml');

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

exports.get = async (req, res, next) => {
  const { url, json } = req.query;
  if (!url) {
    return res.json({ msg: 'no url' });
  }
  try {
    const { content } = await Mercury.parse(url);
    if (json) {
      return res.json(content);
    }
    return res.send(content);
  } catch (e) {
    next(e);
  }
};

module.exports.parse = parse;
