const path = require('path');
const url = require('url');
const fetch = require('isomorphic-fetch');
const logger = require('./logger');
const fixImages = require('./fixImages');

class ParseHelper {
  constructor(link) {
    link = this.parseServices(link);
    if (!link.match(/^http/)) {
      link = `http://${link}`;
    }
    if (link.match(/%3A/)) {
      link = decodeURIComponent(link);
    }
    const matches = link.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
    this.domain = matches && matches[1];
    this.parsed = url.parse(link);
    const { host, protocol } = this.parsed;
    let { dir = '' } = path.parse(link);
    if (dir.match(/:\/\/./)) {
      this.parsed.dir = dir;
    }
    this.link = link;
    this.host = host;
    this.iframe = null;
    this.imgs = [];
    this.fb = false;
    this.sites = {};
    this.title = '';
    this.custom = this.checkCustom();
  }

  getExtractor() {
    if (!this.domain) return false;
    const e = {
      domain: this.domain,
      extend: {
        iframe: {
          selectors: [['iframe[src*=youtube]', 'src']],
          allowMultiple: true,
        },
      },
    };
    let selectors = null;
    if (this.fb) {
      selectors = ['.userContentWrapper'];
    }

    if (this.sites.vk) {
      selectors = ['.wall_text'];
    }
    if (selectors) {
      e.content = { selectors };
    }
    return { ...e };
  }

  setIframes(i) {
    this.iframe = i;
  }

  checkCustom() {
    if (this.host.match(/facebook\.com/)) {
      this.fb = true;
      return true;
    }
    if (this.host.match(/(^t|https?:\/\/t)\.co/)) {
      return true;
    }
    if (this.host.match(/vk\.com/)) {
      this.sites.vk = true;
    }
    if (this.host.match(/cnn\.com/)) {
      this.sites.cnn = true;
    }
    return false;
  }

  async fetchHtml() {
    let content = await fetch(this.link, { timeout: 5000 }).then(r => r.text());
    logger(content, 'fetchContent.html');
    if (this.fb) {
      let title = content.match(/<title.*>([^<]+\/?)/);
      if (title && title[1]) {
        this.title = title[1].substring(0, 100);
      }
      content = content.replace(/\<!-- \</g, '<');
      content = content.replace(/\> --!\>/g, '>');
    }
    return content;
  }

  fixImages(c) {
    if (this.sites.cnn) {
      const match = /cnn\/(.*?)\/http/g;
      const replaces = c.match(match);
      if (replaces) {
        c = c.replace(match, 'cnn/q_auto,w_727,c_fit/http');
      }
    }
    return c;
  }

  parseServices(link) {
    if (link.match(/^(https?:\/\/)?(www.)?google/)) {
      const l = link.match(/url=(.*?)($|&)/);
      if (l && l[1]) return l[1];
    }
    if (link.match(/\/turbo\?text=/)) {
      const l = link.match(/text=(.*?)($|&)/);
      if (l && l[1]) return l[1];
    }
    return link;
  }

  fixHtml(content, iframe) {
    return fixImages.fixHtml(content, iframe, this.parsed);
  }
}

module.exports = ParseHelper;
