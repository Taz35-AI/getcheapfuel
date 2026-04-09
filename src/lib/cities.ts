export interface City {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  population: string;
}

export const UK_CITIES: City[] = [
  { slug: 'london', name: 'London', lat: 51.5074, lng: -0.1278, region: 'Greater London', population: '9M+' },
  { slug: 'manchester', name: 'Manchester', lat: 53.4808, lng: -2.2426, region: 'North West', population: '550K+' },
  { slug: 'birmingham', name: 'Birmingham', lat: 52.4862, lng: -1.8904, region: 'West Midlands', population: '1.1M+' },
  { slug: 'leeds', name: 'Leeds', lat: 53.8008, lng: -1.5491, region: 'Yorkshire', population: '800K+' },
  { slug: 'glasgow', name: 'Glasgow', lat: 55.8642, lng: -4.2518, region: 'Scotland', population: '635K+' },
  { slug: 'liverpool', name: 'Liverpool', lat: 53.4084, lng: -2.9916, region: 'North West', population: '500K+' },
  { slug: 'edinburgh', name: 'Edinburgh', lat: 55.9533, lng: -3.1883, region: 'Scotland', population: '525K+' },
  { slug: 'bristol', name: 'Bristol', lat: 51.4545, lng: -2.5879, region: 'South West', population: '470K+' },
  { slug: 'sheffield', name: 'Sheffield', lat: 53.3811, lng: -1.4701, region: 'Yorkshire', population: '585K+' },
  { slug: 'newcastle', name: 'Newcastle', lat: 54.9783, lng: -1.6178, region: 'North East', population: '300K+' },
  { slug: 'nottingham', name: 'Nottingham', lat: 52.9548, lng: -1.1581, region: 'East Midlands', population: '330K+' },
  { slug: 'cardiff', name: 'Cardiff', lat: 51.4816, lng: -3.1791, region: 'Wales', population: '365K+' },
  { slug: 'belfast', name: 'Belfast', lat: 54.5973, lng: -5.9301, region: 'Northern Ireland', population: '340K+' },
  { slug: 'leicester', name: 'Leicester', lat: 52.6369, lng: -1.1398, region: 'East Midlands', population: '370K+' },
  { slug: 'coventry', name: 'Coventry', lat: 52.4068, lng: -1.5197, region: 'West Midlands', population: '370K+' },
  { slug: 'bradford', name: 'Bradford', lat: 53.7960, lng: -1.7594, region: 'Yorkshire', population: '540K+' },
  { slug: 'southampton', name: 'Southampton', lat: 50.9097, lng: -1.4044, region: 'South East', population: '260K+' },
  { slug: 'brighton', name: 'Brighton', lat: 50.8225, lng: -0.1372, region: 'South East', population: '290K+' },
  { slug: 'plymouth', name: 'Plymouth', lat: 50.3755, lng: -4.1427, region: 'South West', population: '265K+' },
  { slug: 'reading', name: 'Reading', lat: 51.4543, lng: -0.9781, region: 'South East', population: '230K+' },
  { slug: 'derby', name: 'Derby', lat: 52.9225, lng: -1.4746, region: 'East Midlands', population: '260K+' },
  { slug: 'aberdeen', name: 'Aberdeen', lat: 57.1497, lng: -2.0943, region: 'Scotland', population: '230K+' },
  { slug: 'swansea', name: 'Swansea', lat: 51.6214, lng: -3.9436, region: 'Wales', population: '245K+' },
  { slug: 'milton-keynes', name: 'Milton Keynes', lat: 52.0406, lng: -0.7594, region: 'South East', population: '250K+' },
  { slug: 'cambridge', name: 'Cambridge', lat: 52.2053, lng: 0.1218, region: 'East', population: '145K+' },
  { slug: 'oxford', name: 'Oxford', lat: 51.7520, lng: -1.2577, region: 'South East', population: '155K+' },
  { slug: 'york', name: 'York', lat: 53.9591, lng: -1.0815, region: 'Yorkshire', population: '210K+' },
  { slug: 'exeter', name: 'Exeter', lat: 50.7184, lng: -3.5339, region: 'South West', population: '130K+' },
  { slug: 'norwich', name: 'Norwich', lat: 52.6309, lng: 1.2974, region: 'East', population: '215K+' },
  { slug: 'sunderland', name: 'Sunderland', lat: 54.9069, lng: -1.3838, region: 'North East', population: '275K+' },
];
