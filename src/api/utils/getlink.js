const request = require('request');

function getFromShort(link) {
  const changedLink = link.trim();
  return new Promise((resolve, reject) => {
    const newRequest = request(changedLink);
    newRequest.on('response', (response) => {
      newRequest.abort();
      resolve(response.request.uri.href);
    });
    newRequest.on('error', (response) => {
      newRequest.abort();
      reject(response.request.uri.href);
    });
  });
}

const findLink = async (txt, sites) => {
  let links = [];
  sites.map(reg => {
    const l = txt.match(reg) || [];
    links = links.concat(l);
  });
  let link;
  if (links.length) {
    link = await getFromShort(links[0]);
  }
  return link;
};

module.exports = findLink;
