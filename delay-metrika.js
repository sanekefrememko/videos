(function () {
  "use strict";

  /* Перехватывает <script src="..."> для Яндекс.Метрики (и вебвизора) и НЕ даёт
     им реально загрузиться, пока где-то в коде не будет вызван
     window.__releaseDelayedMetrika(). Сама Метрика при этом не ломается: её
     родной сниппет уже умеет ставить вызовы ym(...) в очередь до того, как
     tag.js подгрузится - мы просто придерживаем сам tag.js.

     ВАЖНО: этот скрипт должен быть САМЫМ ПЕРВЫМ в <head>, раньше системной
     вставки Метрики от Тильды. Если Метрика окажется в HTML раньше этого
     скрипта - перехватывать уже нечего, её запрос уйдёт до того, как патч
     встанет. Это и есть то, что мы проверим по вкладке Network. */

  var DELAY_RE = /mc\.yandex\.ru|yandex\.ru\/metrika|webvisor/i;
  var queued = [];
  var bypass = false;

  var proto = window.HTMLScriptElement && window.HTMLScriptElement.prototype;
  if (!proto) return;

  var desc = Object.getOwnPropertyDescriptor(proto, 'src') ||
    Object.getOwnPropertyDescriptor(Element.prototype, 'src');
  var origSetAttribute = proto.setAttribute;

  if (desc && desc.set) {
    Object.defineProperty(proto, 'src', {
      configurable: true,
      get: desc.get,
      set: function (value) {
        if (!bypass && DELAY_RE.test(value || '')) {
          queued.push({ el: this, value: value });
          return;
        }
        desc.set.call(this, value);
      }
    });
  }

  proto.setAttribute = function (name, value) {
    if (!bypass && name && String(name).toLowerCase() === 'src' && DELAY_RE.test(value || '')) {
      queued.push({ el: this, value: value });
      return;
    }
    return origSetAttribute.call(this, name, value);
  };

  /* Позвать эту функцию, когда захочешь, чтобы Метрика реально начала грузиться -
     preload.js будет звать её сам из hidePreloader(). Можно вызвать и вручную из
     консоли для проверки: window.__releaseDelayedMetrika() */
  window.__releaseDelayedMetrika = function () {
    if (!queued.length) return;
    bypass = true;
    queued.forEach(function (item) {
      item.el.src = item.value;
    });
    queued.length = 0;
    bypass = false;
  };
})();
