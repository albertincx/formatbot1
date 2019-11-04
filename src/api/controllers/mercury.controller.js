const fs = require('fs');
const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');
const sanitizeHtmlForce = require('../utils/sanitize');

function imgs(content) {
  const urlRegex = /<img [^>]+\/?>/g;
  return content.match(urlRegex);
}

const make = async (url, isJson = false, san = false) => {
  const result = await Mercury.parse(url);
  if (isJson) {
    return result;
  }
  let { title, content } = result;
  if (process.env.DEV) {
    fs.writeFileSync('.conf/config4.html', content);
  }
  const imgs1 = imgs(content);
  for (let img of imgs1) {
    content = content.replace(img, '##@#IMG#@##');
  }
  if (content && (content.length > 65000 || san)) {
    content = sanitizeHtml(content);
  } else {
    content = '';
  }
  if (content) {
    content = sanitizeHtmlForce(content);
  }
  for (let img of imgs1) {
    content = content.replace('##@#IMG#@##', img);
  }
  return {
    title,
    content,
  };
};

exports.get = async (req, res, next) => {
  const { url, json } = req.query;
  if (!url) {
    return res.json({ msg: 'no url' });
  }
  try {
    const { title, content: c } = await make(url, json);
    if (json) {
      return res.json(c);
    }
    return res.send(c);
  } catch (e) {
    next(e);
  }
};

exports.make = (u, j, s) => make(u, j, s);
