function getAllLinks(text) {
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  return text.match(urlRegex) || [];
}

function getLink(links) {
  let lnk = links[0];
  for (let linkIdx = 1; linkIdx < links.length; linkIdx += 1) {
    if (links[linkIdx].startsWith(lnk)) {
      lnk = links[linkIdx];
    }
  }
  return lnk;
}

const getLinkFromEntity = (entities, txt) => {
  const links = [];
  for (let entIdx = 0; entIdx < entities.length; entIdx += 1) {
    if (entities[entIdx].url) {
      links.push(entities[entIdx].url);
    } else if (entities[entIdx].type === 'url' || entities[entIdx].type === 'text_link') {
      let checkFf = txt.substring(0, entities[entIdx].length);
      checkFf = checkFf.match(/\[(.*?)]/);
      if (!checkFf) {
        links.push(txt.substring(entities[entIdx].offset, entities[entIdx].offset + entities[entIdx].length));
      }
    }
  }

  return links;
};

module.exports.getAllLinks = getAllLinks;
module.exports.getLink = getLink;
module.exports.getLinkFromEntity = getLinkFromEntity;
