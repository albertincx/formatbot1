// const fs = require('fs');
const Mercury = require('@postlight/mercury-parser');

exports.get = async (req, res, next) => {
  const { url, json } = req.query;
  if (!url) {
    return res.json({ msg: 'no url' });
  }
  try {
    return Mercury.parse(url).then(result => {
      if (json) {
        return res.json(result);
      }
      // console.log(result);
      return res.send(result.content);

    });
    /*then(result => fs.writeFileSync('./app/site.json',
        JSON.stringify(result), 'utf8'));*/
    // then(() => console.log(`${execSync('python3 app/pip.py')}`));
  } catch (e) {
    next(e);
  }
};
