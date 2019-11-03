const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');

const make = async (url, isJson = false, san = false) => {
  const result = await Mercury.parse(url);
  if (isJson) {
    return result;
  }
  let { title, content } = result;
  if (content.length > 65000 || san) {
    content = sanitizeHtml(content);
  }
  return {
    title,
    content
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
