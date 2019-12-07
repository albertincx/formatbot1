const san = (content) => {
  const replace = /(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g;
  content = content.replace(replace, '');
  return content;
};
module.exports = san;
