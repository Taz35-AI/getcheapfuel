// Top UK postcode areas (the 1-2 letter prefix at the start of a postcode).
// Covering the 50 largest population centres so the /postcode/[area] pages
// target high-volume long-tail search queries.
//
// Each entry has:
//   area  - the prefix (e.g. "SW" for SW1A 1AA)
//   name  - human-readable name of the area
//   region - broader UK region for context
//   lat/lng - approximate centroid for linking back to the map

export interface PostcodeArea {
  area: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const POSTCODE_AREAS: PostcodeArea[] = [
  // London
  { area: 'E',   name: 'East London',        region: 'London',          lat: 51.5460, lng: -0.0050 },
  { area: 'EC',  name: 'City of London',     region: 'London',          lat: 51.5170, lng: -0.0920 },
  { area: 'N',   name: 'North London',       region: 'London',          lat: 51.5680, lng: -0.1020 },
  { area: 'NW',  name: 'North West London',  region: 'London',          lat: 51.5480, lng: -0.1990 },
  { area: 'SE',  name: 'South East London',  region: 'London',          lat: 51.4800, lng: -0.0030 },
  { area: 'SW',  name: 'South West London',  region: 'London',          lat: 51.4620, lng: -0.1890 },
  { area: 'W',   name: 'West London',        region: 'London',          lat: 51.5100, lng: -0.2010 },
  { area: 'WC',  name: 'West Central London',region: 'London',          lat: 51.5170, lng: -0.1240 },
  // Outer London + Home Counties
  { area: 'BR',  name: 'Bromley',            region: 'Greater London',  lat: 51.4060, lng: 0.0140  },
  { area: 'CR',  name: 'Croydon',            region: 'Greater London',  lat: 51.3730, lng: -0.1000 },
  { area: 'DA',  name: 'Dartford',           region: 'Kent',            lat: 51.4460, lng: 0.2150  },
  { area: 'EN',  name: 'Enfield',            region: 'Greater London',  lat: 51.6520, lng: -0.0810 },
  { area: 'HA',  name: 'Harrow',             region: 'Greater London',  lat: 51.5800, lng: -0.3400 },
  { area: 'IG',  name: 'Ilford',             region: 'Greater London',  lat: 51.5590, lng: 0.0700  },
  { area: 'KT',  name: 'Kingston upon Thames',region:'Surrey',          lat: 51.4120, lng: -0.3000 },
  { area: 'RM',  name: 'Romford',            region: 'Greater London',  lat: 51.5750, lng: 0.1850  },
  { area: 'SM',  name: 'Sutton',             region: 'Greater London',  lat: 51.3620, lng: -0.1940 },
  { area: 'TN',  name: 'Tunbridge Wells',    region: 'Kent',            lat: 51.1320, lng: 0.2630  },
  { area: 'TW',  name: 'Twickenham',         region: 'Greater London',  lat: 51.4460, lng: -0.3310 },
  { area: 'UB',  name: 'Uxbridge',           region: 'Greater London',  lat: 51.5460, lng: -0.4780 },
  { area: 'WD',  name: 'Watford',            region: 'Hertfordshire',   lat: 51.6570, lng: -0.3950 },
  // Major English cities
  { area: 'B',   name: 'Birmingham',         region: 'West Midlands',   lat: 52.4862, lng: -1.8904 },
  { area: 'BA',  name: 'Bath',               region: 'Somerset',        lat: 51.3810, lng: -2.3590 },
  { area: 'BB',  name: 'Blackburn',          region: 'Lancashire',      lat: 53.7480, lng: -2.4820 },
  { area: 'BD',  name: 'Bradford',           region: 'West Yorkshire',  lat: 53.7960, lng: -1.7594 },
  { area: 'BH',  name: 'Bournemouth',        region: 'Dorset',          lat: 50.7192, lng: -1.8808 },
  { area: 'BN',  name: 'Brighton',           region: 'East Sussex',     lat: 50.8225, lng: -0.1372 },
  { area: 'BS',  name: 'Bristol',            region: 'South West',      lat: 51.4545, lng: -2.5879 },
  { area: 'CB',  name: 'Cambridge',          region: 'Cambridgeshire',  lat: 52.2050, lng: 0.1218  },
  { area: 'CF',  name: 'Cardiff',            region: 'Wales',           lat: 51.4816, lng: -3.1791 },
  { area: 'CH',  name: 'Chester',            region: 'Cheshire',        lat: 53.1934, lng: -2.8931 },
  { area: 'CM',  name: 'Chelmsford',         region: 'Essex',           lat: 51.7360, lng: 0.4790  },
  { area: 'CO',  name: 'Colchester',         region: 'Essex',           lat: 51.8959, lng: 0.8919  },
  { area: 'CV',  name: 'Coventry',           region: 'West Midlands',   lat: 52.4068, lng: -1.5197 },
  { area: 'DE',  name: 'Derby',              region: 'Derbyshire',      lat: 52.9225, lng: -1.4746 },
  { area: 'DH',  name: 'Durham',             region: 'County Durham',   lat: 54.7770, lng: -1.5747 },
  { area: 'EH',  name: 'Edinburgh',          region: 'Scotland',        lat: 55.9533, lng: -3.1883 },
  { area: 'EX',  name: 'Exeter',             region: 'Devon',           lat: 50.7184, lng: -3.5339 },
  { area: 'G',   name: 'Glasgow',            region: 'Scotland',        lat: 55.8642, lng: -4.2518 },
  { area: 'GL',  name: 'Gloucester',         region: 'Gloucestershire', lat: 51.8642, lng: -2.2380 },
  { area: 'GU',  name: 'Guildford',          region: 'Surrey',          lat: 51.2362, lng: -0.5704 },
  { area: 'HX',  name: 'Halifax',            region: 'West Yorkshire',  lat: 53.7220, lng: -1.8570 },
  { area: 'IP',  name: 'Ipswich',            region: 'Suffolk',         lat: 52.0567, lng: 1.1482  },
  { area: 'L',   name: 'Liverpool',          region: 'Merseyside',      lat: 53.4084, lng: -2.9916 },
  { area: 'LE',  name: 'Leicester',          region: 'Leicestershire',  lat: 52.6369, lng: -1.1398 },
  { area: 'LN',  name: 'Lincoln',            region: 'Lincolnshire',    lat: 53.2305, lng: -0.5406 },
  { area: 'LS',  name: 'Leeds',              region: 'West Yorkshire',  lat: 53.8008, lng: -1.5491 },
  { area: 'LU',  name: 'Luton',              region: 'Bedfordshire',    lat: 51.8787, lng: -0.4200 },
  { area: 'M',   name: 'Manchester',         region: 'Greater Manchester',lat:53.4808,lng: -2.2426 },
  { area: 'ME',  name: 'Medway',             region: 'Kent',            lat: 51.3880, lng: 0.5500  },
  { area: 'MK',  name: 'Milton Keynes',      region: 'Buckinghamshire', lat: 52.0406, lng: -0.7594 },
  { area: 'N',   name: 'North London',       region: 'London',          lat: 51.5680, lng: -0.1020 }, // duplicate with N above, kept for the dedupe below
  { area: 'NE',  name: 'Newcastle upon Tyne',region: 'Tyne and Wear',   lat: 54.9783, lng: -1.6178 },
  { area: 'NG',  name: 'Nottingham',         region: 'Nottinghamshire', lat: 52.9548, lng: -1.1581 },
  { area: 'NN',  name: 'Northampton',        region: 'Northamptonshire',lat: 52.2405, lng: -0.9027 },
  { area: 'NR',  name: 'Norwich',            region: 'Norfolk',         lat: 52.6309, lng: 1.2974  },
  { area: 'OX',  name: 'Oxford',             region: 'Oxfordshire',     lat: 51.7520, lng: -1.2577 },
  { area: 'PE',  name: 'Peterborough',       region: 'Cambridgeshire',  lat: 52.5695, lng: -0.2405 },
  { area: 'PL',  name: 'Plymouth',           region: 'Devon',           lat: 50.3755, lng: -4.1427 },
  { area: 'PO',  name: 'Portsmouth',         region: 'Hampshire',       lat: 50.8198, lng: -1.0880 },
  { area: 'PR',  name: 'Preston',            region: 'Lancashire',      lat: 53.7632, lng: -2.7031 },
  { area: 'RG',  name: 'Reading',            region: 'Berkshire',       lat: 51.4543, lng: -0.9781 },
  { area: 'S',   name: 'Sheffield',          region: 'South Yorkshire', lat: 53.3811, lng: -1.4701 },
  { area: 'SA',  name: 'Swansea',            region: 'Wales',           lat: 51.6214, lng: -3.9436 },
  { area: 'SG',  name: 'Stevenage',          region: 'Hertfordshire',   lat: 51.9025, lng: -0.2010 },
  { area: 'SK',  name: 'Stockport',          region: 'Greater Manchester',lat:53.4083,lng: -2.1494 },
  { area: 'SL',  name: 'Slough',             region: 'Berkshire',       lat: 51.5105, lng: -0.5950 },
  { area: 'SN',  name: 'Swindon',            region: 'Wiltshire',       lat: 51.5557, lng: -1.7797 },
  { area: 'SO',  name: 'Southampton',        region: 'Hampshire',       lat: 50.9097, lng: -1.4044 },
  { area: 'SP',  name: 'Salisbury',          region: 'Wiltshire',       lat: 51.0688, lng: -1.7945 },
  { area: 'SR',  name: 'Sunderland',         region: 'Tyne and Wear',   lat: 54.9069, lng: -1.3838 },
  { area: 'SS',  name: 'Southend-on-Sea',    region: 'Essex',           lat: 51.5459, lng: 0.7077  },
  { area: 'ST',  name: 'Stoke-on-Trent',     region: 'Staffordshire',   lat: 53.0027, lng: -2.1794 },
  { area: 'WA',  name: 'Warrington',         region: 'Cheshire',        lat: 53.3900, lng: -2.5970 },
  { area: 'WN',  name: 'Wigan',              region: 'Greater Manchester',lat:53.5450,lng: -2.6325 },
  { area: 'WR',  name: 'Worcester',          region: 'Worcestershire',  lat: 52.1920, lng: -2.2200 },
  { area: 'WV',  name: 'Wolverhampton',      region: 'West Midlands',   lat: 52.5870, lng: -2.1288 },
  { area: 'YO',  name: 'York',               region: 'North Yorkshire', lat: 53.9590, lng: -1.0815 },
];

// Dedupe by area (in case of accidental duplicates above)
export const UNIQUE_POSTCODE_AREAS: PostcodeArea[] = Array.from(
  new Map(POSTCODE_AREAS.map(p => [p.area, p])).values()
);

export function findPostcodeArea(area: string): PostcodeArea | undefined {
  return UNIQUE_POSTCODE_AREAS.find(p => p.area.toLowerCase() === area.toLowerCase());
}

// Return true if a station's postcode belongs to a given area prefix.
// Matches the area prefix word-boundary so "B" matches "B5 1AB" but not "BH1 1AB".
export function postcodeMatchesArea(postcode: string, area: string): boolean {
  if (!postcode) return false;
  const clean = postcode.toUpperCase().replace(/\s/g, '');
  const areaUpper = area.toUpperCase();
  if (!clean.startsWith(areaUpper)) return false;
  // Character after the prefix must be a digit so "B" doesn't match "BA".
  const next = clean.charAt(areaUpper.length);
  return /[0-9]/.test(next);
}
