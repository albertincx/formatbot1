const url = require('url');
const fetch = require('isomorphic-fetch');
const logger = require('./logger');

class FixHtml {
  constructor(link) {
    const matches = link.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
    this.domain = matches && matches[1];
    this.parsed = url.parse(link);
    const { host, protocol } = this.parsed;
    this.websiteUrl = `${protocol}//${host}`;
    this.link = link;
    this.host = host;
    this.iframe = null;
    this.imgs = [];
    this.fb = false;
    this.sites = {};
    this.title = '';
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
    if (this.host.match(/facebook\.com|(^t|https?:\/\/t)\.co/)) {
      this.fb = true;
      return true;
    }
    if (this.host.match(/vk\.com/)) {
      this.sites.vk = true;
    }
    return false;
  }

  async fetchHtml() {
    let content = await fetch(this.link, { timeout: 5000 })
      .then(r => r.text());
    logger(content, 'fetchContent.html');
    if (this.fb) {
      let title = content.match(/<title.*>([^<]+\/?)/);
      if (title && title[1]) {
        this.title = title[1];
      }
      content = content.replace(/\<!-- \</g, '<');
      content = content.replace(/\> --!\>/g, '>');
    }
    return content;
  }
}

module.exports = FixHtml;
