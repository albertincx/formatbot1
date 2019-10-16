const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');

exports.get = async (req, res, next) => {
  const { url, json } = req.query;
  if (!url) {
    return res.json({ msg: 'no url' });
  }
  try {
    const result = await Mercury.parse(url);
    if (json) {
      return res.json(result);
    }
    let c = result.content;
    if (c.length > 65000) {
      c = sanitizeHtml(c);
    }
    return res.send(c);
  } catch (e) {
    next(e);
  }
};
