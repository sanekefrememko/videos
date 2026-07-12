(function () {
  "use strict";

  /* Держит указанные <script src="..."> не загруженными, пока где-то в коде не
     будет вызван window.__releaseDelayedScripts(). preload.js зовёт эту функцию
     сам, из hidePreloader() - то есть всё из списка ниже начнёт грузиться ровно
     в момент, когда прелоадер начинает прятаться, а не раньше.

     ВАЖНО: этот скрипт должен быть САМЫМ ПЕРВЫМ в <head>, раньше любых других
     вставок - иначе перехватывать уже нечего, запрос уйдёт раньше, чем патч
     встанет. Проверяется по вкладке Network: до срабатывания прелоадера в
     списке запросов не должно быть ничего из PATTERNS ниже. */

  var PATTERNS = [
    /mc\.yandex\.ru/i,      // Яндекс.Метрика + Вебвизор
    /yandex\.ru\/metrika/i
    // добавляй сюда через запятую всё, что не нужно ДО того, как прелоадер
    // спрячется - найти кандидатов можно во вкладке Network (сортировка по
    // Time/Start time, всё что стартует в первую секунду и не является самой
    // страницей/шрифтами/картинками первого экрана). Примеры того, что часто
    // можно смело сюда добавлять:
    // /mc\.webvisor\.org/i,
    // /top-fwz1\.mail\.ru/i,      // Топ Mail.ru
    // /vk\.com\/rtrg/i,           // пиксель VK
    // /googletagmanager\.com/i,
    // /jivosite\.com/i,           // чат-виджет
    // /callibri\.com/i,
  ];

  var queued = [];
  var bypass = false;

  var proto = window.HTMLScriptElement && window.HTMLScriptElement.prototype;
  if (!proto) return;

  function shouldDelay(value) {
    if (!value) return false;
    for (var i = 0; i < PATTERNS.length; i++) {
      if (PATTERNS[i].test(value)) return true;
    }
    return false;
  }

  var desc = Object.getOwnPropertyDescriptor(proto, 'src') ||
    Object.getOwnPropertyDescriptor(Element.prototype, 'src');
  var origSetAttribute = proto.setAttribute;

  if (desc && desc.set) {
    Object.defineProperty(proto, 'src', {
      configurable: true,
      get: desc.get,
      set: function (value) {
        if (!bypass && shouldDelay(value)) {
          queued.push({ el: this, value: value });
          return;
        }
        desc.set.call(this, value);
      }
    });
  }

  proto.setAttribute = function (name, value) {
    if (!bypass && name && String(name).toLowerCase() === 'src' && shouldDelay(value)) {
      queued.push({ el: this, value: value });
      return;
    }
    return origSetAttribute.call(this, name, value);
  };

  window.__releaseDelayedScripts = function () {
    if (!queued.length) return;
    bypass = true;
    queued.forEach(function (item) {
      item.el.src = item.value;
    });
    queued.length = 0;
    bypass = false;
  };
})();
