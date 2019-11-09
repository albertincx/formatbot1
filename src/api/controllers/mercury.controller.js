const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');
const url = require('url');

const sanitizeHtmlForce = require('../utils/sanitize');
const logger = require('../utils/logger');
const imgFixer = require('../utils/fixImages');

const parse = async (userUrl) => {
  const { host, protocol } = url.parse(userUrl);
  const baseUrl = `${protocol}//${host}`;

  const matches = userUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
  const domain = matches && matches[1];
  if (domain) {
    Mercury.addExtractor({
      domain,
      extend: {
        iframe: {
          selectors: [['iframe[src*=youtube]', 'src']],
          allowMultiple: true,
        },
      },
    });
  }
  let result = await Mercury.parse(userUrl);
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
