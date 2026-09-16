/* ТАКТ — агрегаты за период.
   Отчёты считаются не по одной смене, а по десяти дням, поэтому лежат
   отдельными данными: выводить их из симулятора текущих суток было бы
   враньём — и на защите это первый вопрос, который задают.

   Данные демонстрационные. */

window.TAKT = window.TAKT || {};

TAKT.reports = {
  period: { from: '1 сентября', to: '10 сентября 2026', label: '1–10 сентября 2026' },
  compare: 'август 2026',

  totals: [
    { key: 'rep.mileage',   value: '41 280', unit: 'rep.unitKm',     delta: +3.1 },
    { key: 'rep.downtime',  value: '14:22',  unit: 'rep.unitHm',     delta: -18.4 },
    { key: 'rep.incidents', value: '96',     unit: 'rep.unitPeriod', delta: -11.9 },
    { key: 'rep.energy',    value: '188,4',  unit: 'rep.unitMwh',    delta: -2.6 },
    { key: 'rep.trips',     value: '99,2',   unit: 'rep.unitPct',    delta: +0.8 }
  ],

  /* Пунктуальность по линиям, % рейсов в пределах ±2 минут.
     43-я хуже всех не случайно: она идёт по Пётрковской через
     нерегулируемые переезды — тот же коэффициент, что и в симуляторе. */
  punctuality: [
    { line: '8',  value: 87, prev: 83 },
    { line: '10', value: 84, prev: 80 },
    { line: '11', value: 88, prev: 85 },
    { line: '43', value: 79, prev: 73 },
    { line: '6',  value: 91, prev: 88 },
    { line: '46', value: 94, prev: 92 }
  ],
  punctualityTarget: 85,

  /* Соблюдение интервала: доля промежутков в пределах ±25 % от планового. */
  headwayKeeping: [
    { line: '8',  value: 81, prev: 74 },
    { line: '10', value: 86, prev: 82 },
    { line: '11', value: 84, prev: 80 },
    { line: '43', value: 72, prev: 65 },
    { line: '6',  value: 89, prev: 86 },
    { line: '46', value: 93, prev: 90 }
  ],

  /* Тепловая карта 24×7: доля рейсов, сошедших с графика, в процентах.
     Ряды — дни недели с понедельника. */
  /* Дни недели берутся из словаря: это не данные, а подписи. */
  heatDaysKey: 'rep.days',
  heat: [
    [2, 1, 0, 0, 1, 6, 24, 62, 71, 39, 21, 18, 23, 27, 35, 58, 74, 68, 43, 26, 17, 11, 7, 3],
    [2, 1, 0, 0, 1, 7, 26, 66, 74, 41, 22, 19, 24, 28, 36, 61, 77, 70, 44, 25, 16, 10, 6, 3],
    [1, 1, 0, 0, 2, 8, 27, 64, 70, 38, 20, 17, 22, 26, 34, 59, 72, 66, 41, 24, 15, 10, 6, 2],
    [2, 1, 0, 1, 2, 7, 25, 68, 76, 43, 23, 20, 25, 29, 38, 63, 79, 73, 46, 27, 18, 12, 8, 4],
    [3, 2, 1, 1, 2, 9, 29, 71, 78, 46, 26, 23, 28, 33, 44, 69, 84, 80, 57, 38, 29, 22, 16, 9],
    [6, 4, 2, 1, 1, 4, 11, 22, 31, 38, 42, 45, 47, 46, 44, 43, 45, 42, 36, 31, 27, 22, 17, 11],
    [5, 3, 2, 1, 1, 3, 8, 16, 24, 30, 34, 37, 39, 38, 36, 35, 37, 34, 29, 24, 19, 14, 10, 6]
  ],

  /* Топ мест, где чаще всего рвётся график. Считается по числу событий
     и суммарному простою. */
  junctions: [
    { place: 'Пётрковска / Мицкевича', placeLat: 'Piotrkowska / Mickiewicza', lines: ['8', '43'], events: 34, downtime: '3:42' },
    { place: 'Нарутовича / Килиньского', placeLat: 'Narutowicza / Kilińskiego', lines: ['10', '6'], events: 27, downtime: '2:58' },
    { place: 'Рынек Балуцкий', placeLat: 'Rynek Bałucki', lines: ['8', '11', '46'], events: 21, downtime: '2:11' },
    { place: 'Здровье / Лимановского', placeLat: 'Zdrowie / Limanowskiego', lines: ['46'], events: 16, downtime: '1:24' },
    { place: 'Курчаки', placeLat: 'Kurczaki', lines: ['43'], events: 12, downtime: '1:06' },
    { place: 'Стоки Долне', placeLat: 'Stoki Dolne', lines: ['6'], events: 9, downtime: '0:51' }
  ],

  /* Причины простоя за период, минуты. */
  causes: [
    { type: 'track', minutes: 412 },
    { type: 'collision', minutes: 268 },
    { type: 'breakdown', minutes: 221 },
    { type: 'catenary', minutes: 186 },
    { type: 'medical', minutes: 94 },
    { type: 'bunching', minutes: 71 }
  ]
};
