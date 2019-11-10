const Mercury = require('@postlight/mercury-parser');

exports.get = async (req, res, next) => {
  const { url, json } = req.query;
  if (!url) {
    res.json({ msg: 'no url' });
    return;
  }
  try {
    const { content } = await Mercury.parse(url);
    if (json) {
      res.json(content);
      return;
    }
    res.send(content);
  } catch (e) {
    next(e);
  }
};
