/* ТАКТ — часы смены.
   Единственный источник времени в приложении. Всё остальное — карта, лента,
   графики, числа в шапке — читает отсюда и не хранит своего времени.
   Поэтому рассинхронизироваться при перемотке им просто нечем.

   Время в минутах от полуночи: 466.5 = 07:46:30. */

window.TAKT = window.TAKT || {};

TAKT.clock = (() => {
  const SHIFT_START = 360;   // 06:00
  const SHIFT_END = 1080;    // 18:00
  const START_AT = 466;      // 07:46 — точка, с которой всегда открывается демо

  let minutes = START_AT;
  let rate = 1;              // ×1, ×10, ×60
  let playing = true;
  let scrubbing = false;
  let lastFrame = 0;
  let hiddenAt = null;

  const listeners = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function notify(reason) {
    for (const fn of listeners) fn(minutes, reason);
  }

  function clamp(m) {
    return Math.min(SHIFT_END, Math.max(SHIFT_START, m));
  }

  function frame(now) {
    if (!lastFrame) lastFrame = now;
    const dtSec = Math.min((now - lastFrame) / 1000, 0.25);
    lastFrame = now;

    if (playing && !scrubbing) {
      const next = clamp(minutes + (dtSec * rate) / 60);
      if (next !== minutes) {
        minutes = next;
        if (minutes >= SHIFT_END) playing = false;
        notify('tick');
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Вкладка ушла в фон — время не идёт. При возврате доганяем одним скачком:
     догоняющая анимация на полминуты в рабочем инструменте выглядит как зависание. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = performance.now();
    } else if (hiddenAt !== null) {
      const awaySec = (performance.now() - hiddenAt) / 1000;
      hiddenAt = null;
      lastFrame = 0;
      if (playing && !scrubbing) {
        minutes = clamp(minutes + (awaySec * rate) / 60);
        notify('resume');
      }
    }
  });

  return {
    SHIFT_START, SHIFT_END, START_AT,

    get minutes() { return minutes; },
    get rate() { return rate; },
    get playing() { return playing; },
    get scrubbing() { return scrubbing; },
    get progress() { return (minutes - SHIFT_START) / (SHIFT_END - SHIFT_START); },
    get reducedMotion() { return reduced.matches; },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    setRate(next) {
      rate = next;
      notify('rate');
    },

    play() { if (minutes >= SHIFT_END) minutes = SHIFT_START; playing = true; notify('play'); },
    pause() { playing = false; notify('pause'); },
    toggle() { playing ? this.pause() : this.play(); },

    /* Перемотка. beginScrub/endScrub нужны, чтобы на время протяжки
       ползунка ход часов не спорил с рукой пользователя. */
    beginScrub() { scrubbing = true; notify('scrub-start'); },
    scrubTo(m) { minutes = clamp(m); notify('scrub'); },
    endScrub() { scrubbing = false; lastFrame = 0; notify('scrub-end'); },

    seek(m) { minutes = clamp(m); notify('seek'); },
    step(deltaMin) { minutes = clamp(minutes + deltaMin); notify('seek'); },
    toNow() { minutes = START_AT; notify('seek'); },

    /* Форматирование времени живёт здесь же: в интерфейсе не должно быть
       двух разных представлений одной минуты. */
    hhmm(m = minutes) {
      const total = Math.floor(m);
      const h = Math.floor(total / 60) % 24;
      const mm = total % 60;
      return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    },
    /* Интервал 8.67 мин → «8:40». Секунды тут значат больше, чем сотые. */
    mmss(m) {
      const sign = m < 0 ? '−' : '';
      const abs = Math.abs(m);
      const mm = Math.floor(abs);
      const ss = Math.round((abs - mm) * 60);
      return sign + mm + ':' + String(ss === 60 ? 0 : ss).padStart(2, '0');
    },
    /* Длительность за смену. mm:ss тут не годится: «93:00» читается как
       девяносто три часа, хотя это полтора часа простоя. */
    dur(m) {
      const total = Math.round(m);
      if (total < 60) return total + ' мин';
      return Math.floor(total / 60) + ' ч ' + String(total % 60).padStart(2, '0') + ' мин';
    },
    /* Отклонение от графика: +07:12, −01:30, 00:00 */
    deviation(m) {
      const abs = Math.abs(m);
      const mm = Math.floor(abs);
      const ss = Math.round((abs - mm) * 60);
      const body = String(mm).padStart(2, '0') + ':' + String(ss === 60 ? 0 : ss).padStart(2, '0');
      if (abs < 1 / 60) return '00:00';
      return (m > 0 ? '+' : '−') + body;
    }
  };
})();
