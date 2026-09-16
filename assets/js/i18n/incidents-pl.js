/* ТАКТ — teksty zdarzeń po polsku.
   Osobno od danych: same zdarzenia (czas, linia, miejsce na schemacie)
   są jedne, zmienia się tylko opis. */

window.TAKT = window.TAKT || {};
TAKT.incidentText = TAKT.incidentText || {};

TAKT.incidentText.pl = {
  'INC-0642': {
    title: 'Samochód osobowy na torach',
    place: 'ul. Piotrkowska, przy Piotrkowska Centrum',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Wagon 1361 zgłosił: samochód zablokował tor w kierunku centrum',
      'Dyspozytor potwierdził blokadę, powiadomiono brygady 3, 4, 5',
      'Wezwano miejską służbę holowania, patrol w drodze',
      'Brygadzie 5 wyznaczono postój na Kilczyńskiego',
      'Holownik na miejscu, samochód podniesiony',
      'Tor zwolniony, ruch wznowiony'
    ]
  },
  'INC-0641': {
    title: 'Wagon 1284 zszedł z rozkładu, +7 min',
    place: 'Odcinek Plac Wolności — Piotrkowska Centrum',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'System wykrył odchylenie +4 min u brygady 3',
      'Odchylenie wzrosło do +7 min, interwał za wagonem 12:20',
      'Motorniczemu przekazano polecenie jazdy bez postojów do Kuraku',
      'Odchylenie zmniejszone do +5 min, obserwacja trwa',
      'Wagon wrócił do rozkładu, odchylenie +1:40'
    ]
  },
  'INC-0640': {
    title: 'Pasażerowi zrobiło się słabo',
    place: 'Przystanek Łódź Kaliska',
    responsible: 'Agnieszka Wójcik, kierowniczka zmiany',
    timeline: [
      'Motorniczy brygady 4 wezwał karetkę z przystanku',
      'Pasażerów przesadzono do wagonu 1358, ruch na linii wstrzymany',
      'Karetka na miejscu',
      'Pasażer przekazany ratownikom, wagon gotowy do odjazdu',
      'Ruch na linii 10 wznowiony'
    ]
  },
  'INC-0639': {
    title: 'Nie zamykają się środkowe drzwi, wagon 1347',
    place: 'Przystanek Kurczaki',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Motorniczy zgłosił usterkę drzwi',
      'Zezwolono na jazdę z zablokowanymi drzwiami do Chocianowic',
      'Drzwi zablokowane zgodnie z procedurą, wagon pracuje dalej'
    ]
  },
  'INC-0638': {
    title: 'Zbitka: trzy wagony pod rząd',
    place: 'Przystanek Manufaktura',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Interwał między brygadami 2 i 3 skrócił się do 1:10',
      'Brygadzie 3 wyznaczono postój 3 min na Manufakturze',
      'Interwał przywrócony do 8:40'
    ]
  },
  'INC-0637': {
    title: 'Fałszywe zadziałanie zwrotnicy',
    place: 'Zjazd do zajezdni Brus',
    responsible: 'Służba torowa',
    timeline: [
      'Zwrotnica nie stanęła w położeniu, brygada 2 zatrzymana',
      'Przestawiona ręcznie przez motorniczego',
      'Służba torowa przyjęła zgłoszenie kontroli napędu'
    ]
  },
  'INC-0636': {
    title: 'Zerwana sieć trakcyjna',
    place: 'Odcinek Stoki Dolne — Stoki',
    responsible: 'Pogotowie sieci trakcyjnej',
    timeline: [
      'Utrata napięcia na odcinku, dwa wagony bez zasilania',
      'Ruch na linii 6 zorganizowany do Stoków Dolnych',
      'Pogotowie na miejscu, naciąg przywracany',
      'Napięcie podane, przejazd próbny brygady 1',
      'Ruch przywrócony w pełnym zakresie'
    ]
  },
  'INC-0635': {
    title: 'Interwał rozjechał się do 14 min',
    place: 'Odcinek Politechnika — Banacha',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Brygada 6 opóźniona przy wyjeździe z zajezdni o 9 min',
      'Interwał przed brygadą 6 wzrósł do 14 min',
      'Wypuszczono wagon rezerwowy 1379, interwał wyrównany'
    ]
  },
  'INC-0643': {
    title: 'Interwał ściśnięty do 2:10',
    place: 'Przystanek Pomorska',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Brygady 5 i 6 jadą w konwoju po zatrzymaniu na Manufakturze',
      'Brygadzie 6 wyznaczono postój 4 min',
      'Interwał wyrównany do 8:10'
    ]
  },
  'INC-0644': {
    title: 'Awaria pneumatyki, wagon 1417',
    place: 'Przystanek Tymienieckiego',
    responsible: 'Służba techniczna zajezdni Chojny',
    timeline: [
      'Wagon unieruchomiony, hamulce zablokowane',
      'Pasażerowie wysadzeni, wezwano pomoc techniczną',
      'Ciśnienie przywrócone, próbne ruszenie',
      'Wagon zjeżdża do zajezdni jako rezerwa'
    ]
  },
  'INC-0645': {
    title: 'Sprzęt budowlany w skrajni toru',
    place: 'Przystanek Zdrowie',
    responsible: 'Służba torowa',
    timeline: [
      'Koparka podwykonawcy wyszła poza ogrodzenie budowy',
      'Kontakt z kierownikiem budowy, sprzęt odsuwany',
      'Skrajnia zwolniona'
    ]
  },
  'INC-0646': {
    title: 'Wezwanie karetki do pasażera',
    place: 'Przystanek Kurak',
    responsible: 'Agnieszka Wójcik, kierowniczka zmiany',
    timeline: [
      'Motorniczy brygady 7 zgłosił upadek pasażera w wagonie',
      'Karetka wezwana, wagon zatrzymany na przystanku',
      'Pasażer przekazany ratownikom, ruch wznowiony'
    ]
  },
  'INC-0647': {
    title: 'Kolizja z samochodem osobowym',
    place: 'Skrzyżowanie przy Narutowicza',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Zderzenie przy skręcie samochodu przez tory, bez poszkodowanych',
      'Wezwano policję i pogotowie techniczne',
      'Ruch na linii 10 zorganizowany do Łodzi Kaliskiej',
      'Samochód usunięty, czynności na miejscu zakończone',
      'Ruch przywrócony w pełnym zakresie'
    ]
  },
  'INC-0648': {
    title: 'Spadek napięcia sieci trakcyjnej',
    place: 'Odcinek Kilczyńskiego — Telefoniczna',
    responsible: 'Pogotowie sieci trakcyjnej',
    timeline: [
      'Dwa wagony zgłosiły napięcie poniżej roboczego',
      'Sekcja przełączona na zasilanie rezerwowe',
      'Znaleziono i wymieniono uszkodzony zacisk',
      'Napięcie znamionowe przywrócone'
    ]
  },
  'INC-0649': {
    title: 'Trzy wagony pod rząd na Piotrkowskiej',
    place: 'Przystanek Piotrkowska Centrum',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Szczyt popołudniowy: interwał między brygadami 4, 5 i 6 poniżej 2 min',
      'Brygadom 5 i 6 wyznaczono postoje 3 i 5 min',
      'Interwał przywrócony do 9:20'
    ]
  },
  'INC-0650': {
    title: 'Samochód na torach',
    place: 'Przystanek Włókniarzy',
    responsible: 'Jerzy Nowak, dyspozytor',
    timeline: [
      'Zaparkowany samochód zablokował tor w kierunku Teofilowa',
      'Właściciela odnalazł motorniczy brygady 2',
      'Tor zwolniony'
    ]
  }
};
