const selectors = {
  /**/'Яндекс': {
    'Телефон': {
      selector: '.card-phones-view__phone-number[itemprop="telephone"]',
      pass: ['.card-phones-view__more'],
    },
    'Сайт': {
      selector: 'a.business-urls-view__url',
      attr: 'href',
    },
    'Адрес': {
      selector: '.business-card-view__address',
    },
    'Название': {
      selector: '.card-title-view__title-link a',
    },
  },
  'Google': {
    'Телефон': {
      // selector: '[data-section-id="pn0"] [jstcache="149"].widget-pane-link',
      selector: 'span[aria-label="Телефон"] ~ .section-info-text span.widget-pane-link',
    },
    'Сайт': {
      selector: '[data-tooltip="Перейти на сайт"] span.widget-pane-link',
    },
    'Адрес': {
      selector: '[data-section-id][data-tooltip*="адрес"] span.widget-pane-link',
    },
    'Название': {
      selector: '.section-hero-header-description h1',
    },
  },

  'Площадки на Zoon': {
    'Телефон': {
      selector: '.service-phones-box .tel-phone.js-phone-number',
      pass: ['.service-phones-box .js-showPhoneNumber.showPhoneNumber'],
    },
    'Сайт': {
      selector: '.service-website a',
      attr: 'href',
    },
    'Адрес': {
      selector: '.service-box-description address',
    },
    'Название': {
      selector: '.service-page-header h1,.service-page-header h2',
    },
  },
  'Zoon': {
    'Телефон': {
      selector: '.service-phones-box .tel-phone.js-phone-number',
      pass: ['.service-phones-box .js-showPhoneNumber.showPhoneNumber'],
    },
    'Сайт': {
      selector: '.service-website a',
      attr: 'href',
    },
    'Адрес': {
      selector: '.service-box-description address',
    },
    'Название': {
      selector: '.service-page-header h1,.service-page-header h2',
    },
  },
  'Yell': {
    'Телефон': {
      'selector': '.company__container .company_button_phone span[itemprop=\'telephone\']',
    },
    'Адрес': {
      'selector': '.company__contacts-item-text[itemprop=\'address\']',
    },
    'Название': {
      'selector': 'h1[itemprop=\'name\']',
    },
    /*'Сайт': {
      'selector': '.company__contacts-item-text a',
    },*/
  },
  '2Гис': {
    'Телефон': {
      selector: '.contact__phones a .contact__phonesItemLinkNumber',
      pass: ['.contact__phones .contact__phonesFadeShow'],
    },
    'Сайт': {
      selector: '.contact__websites a.contact__linkText',
    },
    'Адрес': {
      selector: '.card__section._geo .card__addressPart a',
    },
    'Название': {
      selector: 'h1.cardHeader__headerNameText',
    },
  },
};
module.exports = selectors;