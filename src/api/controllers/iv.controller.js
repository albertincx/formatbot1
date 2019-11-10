const parser = require('./mercury.controller');
const makeTelegaph = require('../utils/makeTelegaph');


const makeIvLink = async (url) => {
  const { title, content, source } = await parser.parse(url);
  if (!content) throw 'empty content';
  const obj = {
    title,
    url,
  };
  const telegraphLink = await makeTelegaph(obj, content);
  if (!telegraphLink) throw 'empty ivlink';
  return {
    iv: telegraphLink,
    source,
  };
};
exports.makeIvLink = makeIvLink;
