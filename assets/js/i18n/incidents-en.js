/* ТАКТ — incident texts in English.
   Kept apart from the data: the events themselves (time, line, place on the
   schematic) are the same, only the wording changes. */

window.TAKT = window.TAKT || {};
TAKT.incidentText = TAKT.incidentText || {};

TAKT.incidentText.en = {
  'INC-0642': {
    title: 'Car on the track',
    place: 'Piotrkowska street, near Piotrkowska Centrum',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Car 1361 reported a vehicle blocking the inbound track',
      'Dispatcher confirmed the blockage, runs 3, 4 and 5 notified',
      'City recovery service called, crew on the way',
      'Run 5 told to hold at Kilińskiego',
      'Recovery truck on site, the car has been lifted',
      'Track clear, service resumed'
    ]
  },
  'INC-0641': {
    title: 'Car 1284 off schedule, +7 min',
    place: 'Between Plac Wolności and Piotrkowska Centrum',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'System logged a +4 min deviation on run 3',
      'Deviation grew to +7 min, the gap behind it is 12:20',
      'Driver instructed to run through to Kurak without holds',
      'Deviation reduced to +5 min, still being watched',
      'Car back on schedule, deviation +1:40'
    ]
  },
  'INC-0640': {
    title: 'Passenger taken ill',
    place: 'Łódź Kaliska stop',
    responsible: 'Agnieszka Wójcik, shift manager',
    timeline: [
      'Driver of run 4 called an ambulance from the stop',
      'Passengers moved to car 1358, service on the line suspended',
      'Ambulance on site',
      'Passenger handed over to paramedics, car being prepared to depart',
      'Service on line 10 resumed'
    ]
  },
  'INC-0639': {
    title: 'Centre door will not close, car 1347',
    place: 'Kurczaki stop',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Driver reported a door fault',
      'Cleared to continue to Chocianowice with the door locked out',
      'Door locked out properly, the car stays in service'
    ]
  },
  'INC-0638': {
    title: 'Bunching: three cars in a row',
    place: 'Manufaktura stop',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Gap between runs 2 and 3 shrank to 1:10',
      'Run 3 given a 3-minute hold at Manufaktura',
      'Headway restored to 8:40'
    ]
  },
  'INC-0637': {
    title: 'False point detection',
    place: 'Depot connection at Brus',
    responsible: 'Track service',
    timeline: [
      'The points failed to lock, run 2 stopped',
      'Thrown by hand by the driver',
      'Track service logged a request to check the motor'
    ]
  },
  'INC-0636': {
    title: 'Overhead line down',
    place: 'Between Stoki Dolne and Stoki',
    responsible: 'Overhead line emergency crew',
    timeline: [
      'Power lost on the section, two cars stranded',
      'Line 6 service turned back at Stoki Dolne',
      'Emergency crew on site, tension being restored',
      'Power back on, test run by run 1',
      'Full service restored'
    ]
  },
  'INC-0635': {
    title: 'Gap opened up to 14 minutes',
    place: 'Between Politechnika and Banacha',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Run 6 left the depot 9 minutes late',
      'The gap ahead of run 6 grew to 14 minutes',
      'Reserve car 1379 put out, headway evened out'
    ]
  },
  'INC-0643': {
    title: 'Headway squeezed to 2:10',
    place: 'Pomorska stop',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Runs 5 and 6 bunching after the hold at Manufaktura',
      'Run 6 given a 4-minute hold',
      'Headway evened out to 8:10'
    ]
  },
  'INC-0644': {
    title: 'Air system failure, car 1417',
    place: 'Tymienieckiego stop',
    responsible: 'Chojny depot technical service',
    timeline: [
      'Car immobilised, brakes locked on',
      'Passengers detrained, technical assistance called',
      'Pressure restored, test movement made',
      'Car taken out of service and running back to the depot'
    ]
  },
  'INC-0645': {
    title: 'Construction plant fouling the track',
    place: 'Zdrowie stop',
    responsible: 'Track service',
    timeline: [
      'A contractor’s excavator moved outside the site fence',
      'Site manager contacted, plant being moved back',
      'Clearance restored'
    ]
  },
  'INC-0646': {
    title: 'Ambulance called to a passenger',
    place: 'Kurak stop',
    responsible: 'Agnieszka Wójcik, shift manager',
    timeline: [
      'Driver of run 7 reported a passenger falling inside the car',
      'Ambulance called, car held at the stop',
      'Passenger handed over to paramedics, service resumed'
    ]
  },
  'INC-0647': {
    title: 'Collision with a car',
    place: 'Junction at Narutowicza',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Collision as a car turned across the tracks, no injuries',
      'Police and the technical crew called',
      'Line 10 service turned back at Łódź Kaliska',
      'Car removed, paperwork on site completed',
      'Full service restored'
    ]
  },
  'INC-0648': {
    title: 'Overhead line voltage drop',
    place: 'Between Kilińskiego and Telefoniczna',
    responsible: 'Overhead line emergency crew',
    timeline: [
      'Two cars reported voltage below the working level',
      'Section switched to the standby feed',
      'Damaged clamp found and replaced',
      'Nominal voltage restored'
    ]
  },
  'INC-0649': {
    title: 'Three cars in a row on Piotrkowska',
    place: 'Piotrkowska Centrum stop',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'Evening peak: gaps between runs 4, 5 and 6 under 2 minutes',
      'Runs 5 and 6 given 3- and 5-minute holds',
      'Headway restored to 9:20'
    ]
  },
  'INC-0650': {
    title: 'Car parked on the track',
    place: 'Włókniarzy stop',
    responsible: 'Jerzy Nowak, dispatcher',
    timeline: [
      'A parked car blocked the track towards Teofilów',
      'The owner was found by the driver of run 2',
      'Track clear'
    ]
  }
};
