document.addEventListener('DOMContentLoaded', function() {
  i18next
    .use(i18nextBrowserLanguageDetector)
    .use(i18nextHttpBackend)
    .init({
      debug: false,
      fallbackLng: (code) => {
        if (code.includes('-')) {
          // Region-specific language code (e.g., 'fr-CH')
          return [code, code.split('-')[0], 'en'];
        } else {
          // Language-only code (e.g., 'fr')
          return [code, 'en'];
        }
      },
      backend: {
        loadPath: 'locales/{{lng}}.json'
      },
      load: 'currentOnly',
      languageDetector: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator'],
        lookupQuerystring: 'lng'
      }
    }, function(err, t) {
      updateContent();
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
    // Update placeholder for MultiSelect
    $('select[data-multi-select]').each(function() {
        $(this).data('placeholder', i18next.t('label.languagePlaceholder'));
        new MultiSelect(this, { placeholder: i18next.t('label.languagePlaceholder') });
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
});

function formatPrice(price, language) {
    var priceFormat = i18next.t('priceFormat', { returnObjects: true });
    var decimalSeparator = priceFormat.decimalSeparator || '.';
    var currencySpacing = priceFormat.currencySpacing || '';

    var formattedPrice = price.replace(/[.,]/, decimalSeparator);
    return formattedPrice + currencySpacing;
}
