document.addEventListener('DOMContentLoaded', function() {
  i18next
    .use(i18nextBrowserLanguageDetector)
    .use(i18nextHttpBackend)
    .init({
      debug: false,
      fallbackLng: (code) => {
        if (typeof code === 'string' && code.includes('-')) {
          return [code, code.split('-')[0], 'en'];
        } else if (typeof code === 'string') {
          return [code, 'en'];
        } else {
          return ['en'];
        }
      },
      backend: {
        loadPath: 'https://cdn.jsdelivr.net/gh/table681/QuoteGenerator@d31f71d88ec8198b463441c14c85e679c9656ed9/locales/{{lng}}.json'
      },
      load: 'currentOnly',
      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator'],
        lookupQuerystring: 'lng'
      }
    }, function(err, t) {
      updateContent();
      // Reinitialize MultiSelect after translations are applied
      initializeMultiSelect();
    });

  function updateContent() {
    $('[data-i18n]').each(function() {
        var key = $(this).data('i18n');
        var price = $(this).text().match(/(\d+([.,])\d+)/);
        var options = price ? { price: formatPrice(price[1], i18next.language) } : {};
        var translation = i18next.t(key, options);
        $(this).text(translation);
    });
    // Translate options inside select elements
    $('option[data-i18n]').each(function() {
        var key = $(this).data('i18n');
        var translation = i18next.t(key);
        $(this).text(translation);
    });
    // Translate browse button text
    $('.custom-file-label').each(function() {
        var translation = i18next.t('label.browseButton');
        $(this).attr('data-browse', translation);
        $(this).text(function(_, text) {
            return text.replace(/Browse/, translation);
        });
    });
  }

  function initializeMultiSelect() {
    $('select[data-multi-select]').each(function() {
      new MultiSelect(this, {
        placeholder: i18next.t('label.languagePlaceholder'),
        onChange: function(value, text) {
          calculatePrice(); // Recalculate price on language change
        }
      });
    });
  }
});

function formatPrice(price, language) {
    var priceFormat = i18next.t('priceFormat', { returnObjects: true });
    var decimalSeparator = priceFormat.decimalSeparator || '.';
    var currencySpacing = priceFormat.currencySpacing || '';

    var formattedPrice = price.replace(/[.,]/, decimalSeparator);
    return formattedPrice + currencySpacing;
}
