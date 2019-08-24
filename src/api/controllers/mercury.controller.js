// const fs = require('fs');
const Mercury = require('@postlight/mercury-parser');

exports.get = async (req, res, next) => {
  const { url } = req.query;
  if (!url) {
    return res.json({ msg: 'no url' });
  }
  try {
    Mercury.parse(url).then(result => res.json(result));
    /*then(result => fs.writeFileSync('./app/site.json',
        JSON.stringify(result), 'utf8'));*/
    // then(() => console.log(`${execSync('python3 app/pip.py')}`));
  } catch (e) {
    next(e);
  }
};
