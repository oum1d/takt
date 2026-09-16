/* ТАКТ — схема сети.
   Это схема, а не карта: линии идут под 0°, 45° и 90°, расстояния условны.
   Диспетчер думает схемой — где вагон относительно остановок и пересадок,
   а не где он относительно рельефа Лодзи.
   Поэтому lengthKm задан данными, а не выведен из пикселей.

   nodes: точка с полем `stop` — остановка, без него — просто излом трассы.
   hub: true — пересадочный узел, рисуется крупнее. */

window.TAKT = window.TAKT || {};

TAKT.network = {
  city: 'Лодзь',
  viewBox: [0, 0, 1440, 920],
  cornerRadius: 14,

  depots: [
    { id: 'chojny',      name: 'Хойны',        nameLat: 'Chojny',       x: 636, y: 692, capacity: 22 },
    { id: 'telefoniczna', name: 'Телефоничная', nameLat: 'Telefoniczna', x: 872, y: 58,  capacity: 18 },
    { id: 'brus',        name: 'Брус',         nameLat: 'Brus',         x: 218, y: 380, capacity: 12 }
  ],

  lines: [
    {
      id: '8',
      title: 'Згеж — Пабянице',
      titleLat: 'Zgierz — Pabianice',
      color: 'var(--rail-8)',
      lengthKm: 32.4,
      note: 'Самая длинная линия сети',
      friction: 1.0,
      headwayMin: 9.5,
      roundTripMin: 114,
      depot: 'chojny',
      nodes: [
        { x: 700, y: 60,  stop: 'Згеж Плац', lat: 'Zgierz Plac' },
        { x: 700, y: 130, stop: 'Юлианув', lat: 'Julianów' },
        { x: 700, y: 200, stop: 'Радогощ', lat: 'Radogoszcz' },
        { x: 700, y: 270, stop: 'Рынек Балуцкий', lat: 'Rynek Bałucki', hub: true },
        { x: 700, y: 345, stop: 'Площадь Свободы', lat: 'Plac Wolności' },
        { x: 700, y: 420, stop: 'Пётрковска Центр', lat: 'Piotrkowska Centrum', hub: true, labelPos: 'below' },
        { x: 700, y: 495, stop: 'Мицкевича', lat: 'Mickiewicza' },
        { x: 700, y: 570, stop: 'Курак', lat: 'Kurak' },
        { x: 700, y: 645, stop: 'Хойны', lat: 'Chojny', hub: true },
        { x: 700, y: 700 },
        { x: 760, y: 760 },
        { x: 760, y: 820, stop: 'Руда', lat: 'Ruda' },
        { x: 760, y: 880, stop: 'Пабянице', lat: 'Pabianice' }
      ]
    },
    {
      id: '10',
      title: 'Ретькиня — Килиньского',
      titleLat: 'Retkinia — Kilińskiego',
      color: 'var(--rail-10)',
      lengthKm: 11.7,
      note: 'Главный поперечник запад — восток',
      friction: 1.15,
      headwayMin: 8,
      roundTripMin: 64,
      depot: 'brus',
      nodes: [
        { x: 260, y: 620, stop: 'Ретькиня', lat: 'Retkinia' },
        { x: 340, y: 620, stop: 'Банаха', lat: 'Banacha' },
        { x: 420, y: 620, stop: 'Политехника', lat: 'Politechnika', hub: true },
        { x: 480, y: 620 },
        { x: 580, y: 520 },
        { x: 580, y: 420, stop: 'Лодзь Калиска', lat: 'Łódź Kaliska' },
        { x: 700, y: 420, stop: 'Пётрковска Центр', lat: 'Piotrkowska Centrum', hub: true },
        { x: 820, y: 420, stop: 'Нарутовича', lat: 'Narutowicza', hub: true },
        { x: 900, y: 420, stop: 'Лодзь Фабрична', lat: 'Łódź Fabryczna' },
        { x: 980, y: 420, stop: 'Килиньского', lat: 'Kilińskiego' }
      ]
    },
    {
      id: '11',
      title: 'Теофилув — Янув',
      titleLat: 'Teofilów — Janów',
      color: 'var(--rail-11)',
      lengthKm: 13.6,
      note: 'Северная дуга через Манифактуру',
      friction: 0.95,
      headwayMin: 8.2,
      roundTripMin: 74,
      depot: 'telefoniczna',
      nodes: [
        { x: 240, y: 140, stop: 'Теофилув', lat: 'Teofilów' },
        { x: 340, y: 140, stop: 'Влукняжи', lat: 'Włókniarzy' },
        { x: 400, y: 140 },
        { x: 530, y: 270 },
        { x: 580, y: 270, stop: 'Манифактура', lat: 'Manufaktura', hub: true },
        { x: 700, y: 270, stop: 'Рынек Балуцкий', lat: 'Rynek Bałucki', hub: true },
        { x: 820, y: 270, stop: 'Помораска', lat: 'Pomorska' },
        { x: 880, y: 270 },
        { x: 980, y: 370 },
        { x: 1060, y: 370, stop: 'Видзев', lat: 'Widzew' },
        { x: 1180, y: 370, stop: 'Янув', lat: 'Janów' }
      ]
    },
    {
      id: '43',
      title: 'Марысин — Хоцяновице',
      titleLat: 'Marysin — Chocianowice',
      color: 'var(--rail-43)',
      lengthKm: 14.9,
      note: 'Диагональ через Пётрковску',
      friction: 1.3,
      headwayMin: 9,
      roundTripMin: 81,
      depot: 'telefoniczna',
      nodes: [
        { x: 1120, y: 120, stop: 'Марысин', lat: 'Marysin' },
        { x: 1000, y: 120, stop: 'Инфлянцка', lat: 'Inflancka' },
        { x: 940, y: 120, stop: 'Телефоничная', lat: 'Telefoniczna', hub: true },
        { x: 880, y: 120 },
        { x: 820, y: 180 },
        { x: 820, y: 240, stop: 'Кильчиньского', lat: 'Kilczyńskiego' },
        { x: 820, y: 300 },
        { x: 700, y: 420, stop: 'Пётрковска Центр', lat: 'Piotrkowska Centrum', hub: true },
        { x: 580, y: 540 },
        { x: 580, y: 600, stop: 'Курчаки', lat: 'Kurczaki' },
        { x: 500, y: 680 },
        { x: 400, y: 680, stop: 'Хоцяновице', lat: 'Chocianowice' }
      ]
    },
    {
      id: '6',
      title: 'Хойны — Стоки',
      titleLat: 'Chojny — Stoki',
      color: 'var(--rail-6)',
      lengthKm: 9.4,
      note: 'Юг — северо-восток мимо центра',
      friction: 0.9,
      headwayMin: 8.5,
      roundTripMin: 51,
      depot: 'chojny',
      nodes: [
        { x: 700, y: 645, stop: 'Хойны', lat: 'Chojny', hub: true },
        { x: 760, y: 645, stop: 'Домброва', lat: 'Dąbrowa' },
        { x: 820, y: 645 },
        { x: 820, y: 570, stop: 'Ксенжи Млын', lat: 'Księży Młyn' },
        { x: 820, y: 495, stop: 'Тыменецкого', lat: 'Tymienieckiego' },
        { x: 820, y: 420, stop: 'Нарутовича', lat: 'Narutowicza', hub: true },
        { x: 820, y: 360 },
        { x: 900, y: 280 },
        { x: 980, y: 280, stop: 'Стоки Долне', lat: 'Stoki Dolne' },
        { x: 1100, y: 280 },
        { x: 1160, y: 220 },
        { x: 1160, y: 140, stop: 'Стоки', lat: 'Stoki' }
      ]
    },
    {
      id: '46',
      title: 'Политехника — Рынек Балуцкий',
      titleLat: 'Politechnika — Rynek Bałucki',
      color: 'var(--rail-46)',
      lengthKm: 6.6,
      note: 'Западное полукольцо, минует центр',
      friction: 0.78,
      headwayMin: 12,
      roundTripMin: 36,
      depot: 'brus',
      nodes: [
        { x: 420, y: 620, stop: 'Политехника', lat: 'Politechnika', hub: true },
        { x: 360, y: 620 },
        { x: 280, y: 540 },
        { x: 280, y: 460, stop: 'Каролев', lat: 'Karolew' },
        { x: 280, y: 380, stop: 'Брус', lat: 'Brus', hub: true },
        { x: 280, y: 300 },
        { x: 360, y: 220 },
        { x: 440, y: 220, stop: 'Здровье', lat: 'Zdrowie' },
        { x: 490, y: 220 },
        { x: 540, y: 270 },
        { x: 580, y: 270, stop: 'Манифактура', lat: 'Manufaktura', hub: true },
        { x: 700, y: 270, stop: 'Рынек Балуцкий', lat: 'Rynek Bałucki', hub: true }
      ]
    }
  ]
};
