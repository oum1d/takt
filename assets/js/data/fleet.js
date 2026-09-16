/* ТАКТ — подвижной состав.
   52 вагона в парке, 47 из них на линии. Пять стоят в депо:
   два в плановом ТО, один после вчерашнего ДТП, два в резерве.

   `tab` — номер выхода (бригады). Диспетчер оперирует именно выходом:
   «восьмёрка, третий выход опаздывает», а не порядковым номером в списке.

   Данные демонстрационные: номера, модели и фамилии вымышлены. */

window.TAKT = window.TAKT || {};

TAKT.fleet = [
  // Линия 8 — Згеж — Пабянице, 12 выходов
  { id: 1201, line: '8',  tab: 1,  model: 'Moderus Beta MF 20',  driver: 'Ежи Ковальски', driverLat: 'Jerzy Kowalski' },
  { id: 1214, line: '8',  tab: 2,  model: 'Moderus Beta MF 20',  driver: 'Анна Вуйчик', driverLat: 'Anna Wójcik' },
  { id: 1284, line: '8',  tab: 3,  model: 'Konstal 805Na',       driver: 'Марек Левандовски', driverLat: 'Marek Lewandowski' },
  { id: 1233, line: '8',  tab: 4,  model: 'Pesa Swing 120NaL',   driver: 'Ханна Зелиньска', driverLat: 'Hanna Zielińska' },
  { id: 1247, line: '8',  tab: 5,  model: 'Pesa Swing 120NaL',   driver: 'Томаш Каминьски', driverLat: 'Tomasz Kamiński' },
  { id: 1256, line: '8',  tab: 6,  model: 'Moderus Beta MF 20',  driver: 'Барбара Возняк', driverLat: 'Barbara Woźniak' },
  { id: 1262, line: '8',  tab: 7,  model: 'Konstal 805Na',       driver: 'Павел Шиманьски', driverLat: 'Paweł Szymański' },
  { id: 1271, line: '8',  tab: 8,  model: 'Duewag M8C',          driver: 'Иоанна Домбровска', driverLat: 'Joanna Dąbrowska' },
  { id: 1295, line: '8',  tab: 9,  model: 'Pesa Swing 120NaL',   driver: 'Кшиштоф Козловски', driverLat: 'Krzysztof Kozłowski' },
  { id: 1302, line: '8',  tab: 10, model: 'Moderus Beta MF 20',  driver: 'Магдалена Мазур', driverLat: 'Magdalena Mazur' },
  { id: 1318, line: '8',  tab: 11, model: 'Konstal 805Na',       driver: 'Анджей Кравчик', driverLat: 'Andrzej Krawczyk' },
  { id: 1326, line: '8',  tab: 12, model: 'Duewag M8C',          driver: 'Эва Пётровска', driverLat: 'Ewa Piotrowska' },

  // Линия 43 — Марысин — Хоцяновице, 9 выходов
  { id: 1347, line: '43', tab: 1,  model: 'Konstal 805Na',       driver: 'Рафал Грабовски', driverLat: 'Rafał Grabowski' },
  { id: 1352, line: '43', tab: 2,  model: 'Duewag M8C',          driver: 'Малгожата Новицка', driverLat: 'Małgorzata Nowicka' },
  { id: 1361, line: '43', tab: 3,  model: 'Moderus Beta MF 20',  driver: 'Збигнев Павловски', driverLat: 'Zbigniew Pawłowski' },
  { id: 1374, line: '43', tab: 4,  model: 'Konstal 805Na',       driver: 'Катажина Михальска', driverLat: 'Katarzyna Michalska' },
  { id: 1383, line: '43', tab: 5,  model: 'Pesa Swing 120NaL',   driver: 'Гжегож Круль', driverLat: 'Grzegorz Król' },
  { id: 1390, line: '43', tab: 6,  model: 'Duewag M8C',          driver: 'Уршуля Вечорек', driverLat: 'Urszula Wieczorek' },
  { id: 1404, line: '43', tab: 7,  model: 'Moderus Beta MF 20',  driver: 'Мариуш Ярош', driverLat: 'Mariusz Jarosz' },
  { id: 1411, line: '43', tab: 8,  model: 'Konstal 805Na',       driver: 'Данута Стемпень', driverLat: 'Danuta Stępień' },
  { id: 1423, line: '43', tab: 9,  model: 'Pesa Swing 120NaL',   driver: 'Себастьян Ольшевски', driverLat: 'Sebastian Olszewski' },

  // Линия 11 — Теофилув — Янув, 9 выходов
  { id: 1208, line: '11', tab: 1,  model: 'Pesa Swing 120NaL',   driver: 'Агнешка Круль', driverLat: 'Agnieszka Król' },
  { id: 1219, line: '11', tab: 2,  model: 'Moderus Beta MF 20',  driver: 'Артур Зайонц', driverLat: 'Artur Zając' },
  { id: 1228, line: '11', tab: 3,  model: 'Duewag M8C',          driver: 'Беата Гурска', driverLat: 'Beata Górska' },
  { id: 1241, line: '11', tab: 4,  model: 'Konstal 805Na',       driver: 'Дариуш Рутковски', driverLat: 'Dariusz Rutkowski' },
  { id: 1253, line: '11', tab: 5,  model: 'Pesa Swing 120NaL',   driver: 'Иренеуш Бонк', driverLat: 'Ireneusz Bąk' },
  { id: 1267, line: '11', tab: 6,  model: 'Moderus Beta MF 20',  driver: 'Юстына Сикора', driverLat: 'Justyna Sikora' },
  { id: 1279, line: '11', tab: 7,  model: 'Duewag M8C',          driver: 'Лешек Валчак', driverLat: 'Leszek Walczak' },
  { id: 1288, line: '11', tab: 8,  model: 'Konstal 805Na',       driver: 'Наталия Собода', driverLat: 'Natalia Soboda' },
  { id: 1297, line: '11', tab: 9,  model: 'Pesa Swing 120NaL',   driver: 'Патрик Дудек', driverLat: 'Patryk Dudek' },

  // Линия 10 — Ретькиня — Килиньского, 8 выходов
  { id: 1309, line: '10', tab: 1,  model: 'Moderus Beta MF 20',  driver: 'Рената Вильк', driverLat: 'Renata Wilk' },
  { id: 1315, line: '10', tab: 2,  model: 'Pesa Swing 120NaL',   driver: 'Славомир Ясиньски', driverLat: 'Sławomir Jasiński' },
  { id: 1323, line: '10', tab: 3,  model: 'Konstal 805Na',       driver: 'Тереса Барань', driverLat: 'Teresa Barań' },
  { id: 1338, line: '10', tab: 4,  model: 'Duewag M8C',          driver: 'Вальдемар Сова', driverLat: 'Waldemar Sowa' },
  { id: 1344, line: '10', tab: 5,  model: 'Moderus Beta MF 20',  driver: 'Зофья Хмель', driverLat: 'Zofia Chmiel' },
  { id: 1358, line: '10', tab: 6,  model: 'Pesa Swing 120NaL',   driver: 'Бартош Кубяк', driverLat: 'Bartosz Kubiak' },
  { id: 1366, line: '10', tab: 7,  model: 'Konstal 805Na',       driver: 'Эльжбета Ситек', driverLat: 'Elżbieta Sitek' },
  { id: 1379, line: '10', tab: 8,  model: 'Duewag M8C',          driver: 'Якуб Мрозек', driverLat: 'Jakub Mrozek' },

  // Линия 6 — Хойны — Стоки, 6 выходов
  { id: 1386, line: '6',  tab: 1,  model: 'Konstal 805Na',       driver: 'Люцина Адамчик', driverLat: 'Lucyna Adamczyk' },
  { id: 1395, line: '6',  tab: 2,  model: 'Moderus Beta MF 20',  driver: 'Норберт Голомб', driverLat: 'Norbert Gołąb' },
  { id: 1408, line: '6',  tab: 3,  model: 'Pesa Swing 120NaL',   driver: 'Ольга Пшибыл', driverLat: 'Olga Przybył' },
  { id: 1417, line: '6',  tab: 4,  model: 'Duewag M8C',          driver: 'Радослав Зюлковски', driverLat: 'Radosław Ziółkowski' },
  { id: 1429, line: '6',  tab: 5,  model: 'Konstal 805Na',       driver: 'Сильвия Марчак', driverLat: 'Sylwia Marczak' },
  { id: 1436, line: '6',  tab: 6,  model: 'Moderus Beta MF 20',  driver: 'Витольд Ковалик', driverLat: 'Witold Kowalik' },

  // Линия 46 — Политехника — Рынек Балуцкий, 3 выхода
  { id: 1442, line: '46', tab: 1,  model: 'Konstal 805Na',       driver: 'Александра Ленарт', driverLat: 'Aleksandra Lenart' },
  { id: 1455, line: '46', tab: 2,  model: 'Duewag M8C',          driver: 'Мирослав Щепаняк', driverLat: 'Mirosław Szczepaniak' },
  { id: 1463, line: '46', tab: 3,  model: 'Konstal 805Na',       driver: 'Ивона Лис', driverLat: 'Iwona Lis' },

  // Вне линии
  { id: 1470, line: null, tab: null, model: 'Konstal 805Na',      driver: null, depot: 'chojny',        reason: 'Плановое ТО-2, выпуск 12 сентября' },
  { id: 1478, line: null, tab: null, model: 'Duewag M8C',         driver: null, depot: 'telefoniczna',  reason: 'Замена токоприёмника' },
  { id: 1484, line: null, tab: null, model: 'Moderus Beta MF 20', driver: null, depot: 'chojny',        reason: 'После ДТП 09.09, ждёт экспертизы' },
  { id: 1491, line: null, tab: null, model: 'Pesa Swing 120NaL',  driver: null, depot: 'brus',          reason: 'Резерв' },
  { id: 1499, line: null, tab: null, model: 'Konstal 805Na',      driver: null, depot: 'brus',          reason: 'Резерв' }
];
