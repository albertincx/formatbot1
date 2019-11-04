const request = require('request');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { make } = require('./mercury.controller');
const makeTelegaph = require('../utils/makeTelegaph');
const sites = require('../routes/format/sites');

function getFromShort(link) {
  const changedLink = link.trim();
  return new Promise((resolve) => {
    const newRequest = request(changedLink);
    newRequest.on('response', (response) => {
      newRequest.abort();
      resolve(response.request.uri.href);
    });
  });
}

function domToNode(domNode) {
  if (domNode.nodeType == domNode.TEXT_NODE) {
    return domNode.data;
  }
  if (domNode.nodeType != domNode.ELEMENT_NODE) {
    return false;
  }
  var nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (var i = 0; i < domNode.attributes.length; i++) {
    var attr = domNode.attributes[i];
    if (attr.name == 'href' || attr.name == 'src') {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (var i = 0; i < domNode.childNodes.length; i++) {
      var child = domNode.childNodes[i];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

exports.makeIvLink = async (txt, msg, linkFromText, tg) => {
  try {
    let links = [];
    sites.map(reg => {
      const l = txt.match(reg) || [];
      links = links.concat(l);
    });
    let link;
    if (links.length) {
      link = await getFromShort(links[0]);
    } else if (linkFromText) {
      link = linkFromText;
    }
    if (tg) {
      const { title, content } = await make(link, false, true);
      let dom = new JSDOM(`<!DOCTYPE html>${content}`);
      dom = domToNode(dom.window.document.body).children;
      const d = await makeTelegaph(title, JSON.stringify(dom));
      return d;
    }
    return link;
  } catch (error) {
    console.log(error);
  }
};
