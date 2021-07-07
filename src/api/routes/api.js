const fs = require('fs');
const express = require('express');

// eslint-disable-next-line consistent-return
const get = (req, res, next) => {
  const {pwd,back} = req.query;
  if (!pwd || pwd !== process.env.SKIP_PWD) {
    return res.json({msg: 'no file'});
  }
  try {
    const someFile = '.env';
    fs.readFile(someFile, 'utf8', function (err,data) {
        console.log(err,data)
        if (err) {
            return res.json({msg: '1'});
        }
        var result;
        if (back) {
            result = data.replace(/SKIP_ITEMS=1/g, 'SKIP_ITEMS=0');
        } else {
            result = data.replace(/SKIP_ITEMS=0/g, 'SKIP_ITEMS=1');
        }
        fs.writeFile(someFile, result, 'utf8', function (err) {
            if (err) console.log(err);
            return res.json({msg: ''});
        });
    });
  } catch (e) {
    console.log(e)
    next(e);
  }
};

const router = express.Router();
router.use('/file', get);

module.exports = router;
