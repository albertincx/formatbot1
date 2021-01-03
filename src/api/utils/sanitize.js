const atob = require('atob');

const v1 = [
  'c2',
  'hv',
  'cn',
  'R',
  'wa',
  'Xh',
  'lb', 'C5', 'ha', 'Q', '=', '=',
];

const san = (contentParam, params) => {
  const replace = /(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g;
  let content = contentParam.replace(replace, '');
  if (params && params.noLinks) {
    content = content.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '$1');
  }
  content = content.replace(/<a href="(.*?)"><\/a>/gi, '');
  const r = `<a href="(.*?)">(.*?)[${atob(v1.join(''))}](.*?)<\\/a>`;
  content = content.replace(new RegExp(r, 'gi'), '');

  return content;
};

module.exports = san;
