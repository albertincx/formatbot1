<<<<<<< HEAD
const fs = require('fs');
const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');
const sanitizeHtmlForce = require('../utils/sanitize');
=======
const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');
const sanitizeHtmlForce = require('../utils/sanitize');
const logger = require('../utils/logger');
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af

function imgs(content) {
  const urlRegex = /<img [^>]+\/?>/g;
  return content.match(urlRegex);
}

const make = async (url, isJson = false, san = false) => {
<<<<<<< HEAD
  const result = await Mercury.parse(url);
=======
  let result = '';
  try {
    result = await Mercury.parse(url);
  } catch (e) {
    return {
      title: '',
      content: result,
    };
  }
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
  if (isJson) {
    return result;
  }
  let { title, content } = result;
<<<<<<< HEAD
  if (process.env.DEV) {
    fs.writeFileSync('.conf/config4.html', content);
  }
=======

  logger(content, 'mercury.html');

>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
  const imgs1 = imgs(content) || [];
  for (let img of imgs1) {
    content = content.replace(img, '##@#IMG#@##');
  }
<<<<<<< HEAD
=======

  logger(`before san ${content.length}`);

>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
  if (content && (content.length > 65000 || san)) {
    content = sanitizeHtml(content);
  } else {
    content = '';
  }
  if (content) {
    content = sanitizeHtmlForce(content);
  }
<<<<<<< HEAD
  for (let img of imgs1) {
    content = content.replace('##@#IMG#@##', img);
  }
=======

  for (let img of imgs1) {
    content = content.replace('##@#IMG#@##', img);
  }

  logger(content, 'tg_content.html');
  logger(`after san ${content.length}`);

>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
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
    const { content: c } = await make(url, json);
    if (json) {
      return res.json(c);
    }
    return res.send(c);
  } catch (e) {
    next(e);
  }
};

exports.make = (u, j, s) => make(u, j, s);
