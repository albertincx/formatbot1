const jsdom = require('jsdom');

const {JSDOM} = jsdom;

function domToNode(domNode) {
  if (domNode.nodeType === domNode.TEXT_NODE) {
    return domNode.data;
  }
  if (domNode.nodeType !== domNode.ELEMENT_NODE) {
    return false;
  }
  const nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (let nodeIdx = 0; nodeIdx < domNode.attributes.length; nodeIdx += 1) {
    const attr = domNode.attributes[nodeIdx];
    if (attr.name === 'href' || attr.name === 'src') {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (let childIdx = 0; childIdx < domNode.childNodes.length; childIdx += 1) {
      const child = domNode.childNodes[childIdx];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

const getDom = html => new JSDOM(`<!DOCTYPE html>${html}`).window.document;

const toDomNode = html => {
  const dom = getDom(html);
  return domToNode(dom.body).children;
};

module.exports.toDomNode = toDomNode;
module.exports.getDom = getDom;
