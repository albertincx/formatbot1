const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');
const sanitizeHtmlForce = require('../utils/sanitize');
const logger = require('../utils/logger');
const imgFixer = require('../utils/fixImages');

const parse = async (userUrl, isJson = false, san = false) => {
  let result = '';
  try {
    const matches = userUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
    const domain = matches && matches[1];
    if (domain) {
      var customExtractor = {
        domain,
        extend: {
          iframe: {
            selectors: [['iframe[src*=youtube]', 'src']],
            allowMultiple: true,
          },
        },
      };
      Mercury.addExtractor(customExtractor);
    }
    result = await Mercury.parse(userUrl);
  } catch (e) {
    return {
      title: '',
      content: result,
    };
  }
  if (isJson) {
    return result;
  }
  let { title, content, url: source, iframe } = result;
  if (content) {
    logger(content, 'mercury.html');
    const imgs = imgFixer.findImages(content);
    content = imgFixer.replaceImages(content, imgs);
    logger(`before san ${content.length}`);
    if ((content.length > 65000 || san)) {
      content = sanitizeHtml(content);
    } else {
      content = '';
    }
    content = sanitizeHtmlForce(content);
    content = imgFixer.restoreImages(content, imgs);
    content = imgFixer.insertYoutube(content, iframe);
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
    const { content: c } = await parse(url, json);
    if (json) {
      return res.json(c);
    }
    return res.send(c);
  } catch (e) {
    next(e);
  }
};

module.exports.parse = parse;
