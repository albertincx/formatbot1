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
  }

  getExtracktor() {
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
    if (this.fb) {
      e.content = {
        selectors: ['.userContentWrapper']
      };
    }
    return { ...e };
  }

  setIframes(i) {
    this.iframe = i;
  }

  checkCustom() {
    if (this.host.match(/facebook\.com|t\.co/)) {
      this.fb = true;
      return true;
    }
    return false;
  }

  async fetchHtml() {
    let content = await fetch(this.link, { timeout: 5000 })
      .then(r => r.text());
    logger(content, 'fetchContent.html');
    if (this.fb) {
      content = content.replace(/\<!-- \</g, '<');
      content = content.replace(/\> --!\>/g, '>');
    }
    return content;
  }
}

module.exports = FixHtml;
