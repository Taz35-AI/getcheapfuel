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

  // England - Lancashire & North West
  { area: 'BL',  name: 'Bolton',             region: 'Greater Manchester', lat: 53.5789, lng: -2.4290 },
  { area: 'CA',  name: 'Carlisle',           region: 'Cumbria',         lat: 54.8925, lng: -2.9329 },
  { area: 'FY',  name: 'Blackpool',          region: 'Lancashire',      lat: 53.8175, lng: -3.0357 },
  { area: 'HU',  name: 'Hull',               region: 'East Yorkshire',  lat: 53.7446, lng: -0.3352 },
  { area: 'LA',  name: 'Lancaster',          region: 'Lancashire',      lat: 54.0466, lng: -2.8007 },
  { area: 'OL',  name: 'Oldham',             region: 'Greater Manchester', lat: 53.5409, lng: -2.1114 },
  { area: 'WF',  name: 'Wakefield',          region: 'West Yorkshire',  lat: 53.6833, lng: -1.4977 },

  // England - South & South West
  { area: 'CT',  name: 'Canterbury',         region: 'Kent',            lat: 51.2802, lng: 1.0789  },
  { area: 'DT',  name: 'Dorchester',         region: 'Dorset',          lat: 50.7156, lng: -2.4371 },
  { area: 'RH',  name: 'Redhill',            region: 'Surrey',          lat: 51.2398, lng: -0.1700 },
  { area: 'TA',  name: 'Taunton',            region: 'Somerset',        lat: 51.0145, lng: -3.1068 },
  { area: 'TQ',  name: 'Torquay',            region: 'Devon',           lat: 50.4619, lng: -3.5253 },
  { area: 'TR',  name: 'Truro',              region: 'Cornwall',        lat: 50.2632, lng: -5.0510 },

  // England - Midlands, Yorkshire & North East
  { area: 'CW',  name: 'Crewe',              region: 'Cheshire',        lat: 53.0975, lng: -2.4436 },
  { area: 'DL',  name: 'Darlington',         region: 'County Durham',   lat: 54.5254, lng: -1.5528 },
  { area: 'DN',  name: 'Doncaster',          region: 'South Yorkshire', lat: 53.5227, lng: -1.1335 },
  { area: 'DY',  name: 'Dudley',             region: 'West Midlands',   lat: 52.5088, lng: -2.0893 },
  { area: 'HD',  name: 'Huddersfield',       region: 'West Yorkshire',  lat: 53.6458, lng: -1.7850 },
  { area: 'HG',  name: 'Harrogate',          region: 'North Yorkshire', lat: 53.9920, lng: -1.5418 },
  { area: 'HP',  name: 'Hemel Hempstead',    region: 'Hertfordshire',   lat: 51.7536, lng: -0.4673 },
  { area: 'HR',  name: 'Hereford',           region: 'Herefordshire',   lat: 52.0565, lng: -2.7160 },
  { area: 'TF',  name: 'Telford',            region: 'Shropshire',      lat: 52.6766, lng: -2.4458 },
  { area: 'TS',  name: 'Middlesbrough',      region: 'Teesside',        lat: 54.5742, lng: -1.2349 },
  { area: 'WS',  name: 'Walsall',            region: 'West Midlands',   lat: 52.5862, lng: -2.0101 },

  // Wales
  { area: 'LD',  name: 'Llandrindod Wells',  region: 'Wales',           lat: 52.2421, lng: -3.3800 },
  { area: 'LL',  name: 'Llandudno',          region: 'Wales',           lat: 53.3244, lng: -3.8242 },
  { area: 'NP',  name: 'Newport',            region: 'Wales',           lat: 51.5881, lng: -2.9971 },
  { area: 'SY',  name: 'Shrewsbury',         region: 'Shropshire',      lat: 52.7069, lng: -2.7527 },

  // Scotland
  { area: 'AB',  name: 'Aberdeen',           region: 'Scotland',        lat: 57.1497, lng: -2.0943 },
  { area: 'DD',  name: 'Dundee',             region: 'Scotland',        lat: 56.4620, lng: -2.9707 },
  { area: 'DG',  name: 'Dumfries',           region: 'Scotland',        lat: 55.0705, lng: -3.6083 },
  { area: 'FK',  name: 'Falkirk',            region: 'Scotland',        lat: 56.0019, lng: -3.7839 },
  { area: 'HS',  name: 'Stornoway',          region: 'Outer Hebrides',  lat: 58.2094, lng: -6.3782 },
  { area: 'IV',  name: 'Inverness',          region: 'Highlands',       lat: 57.4778, lng: -4.2247 },
  { area: 'KA',  name: 'Kilmarnock',         region: 'Scotland',        lat: 55.6117, lng: -4.4958 },
  { area: 'KW',  name: 'Kirkwall',           region: 'Orkney',          lat: 58.9809, lng: -2.9602 },
  { area: 'KY',  name: 'Kirkcaldy',          region: 'Scotland',        lat: 56.1166, lng: -3.1575 },
  { area: 'ML',  name: 'Motherwell',         region: 'Scotland',        lat: 55.7832, lng: -3.9918 },
  { area: 'PA',  name: 'Paisley',            region: 'Scotland',        lat: 55.8399, lng: -4.4261 },
  { area: 'PH',  name: 'Perth',              region: 'Scotland',        lat: 56.3950, lng: -3.4308 },
  { area: 'TD',  name: 'Galashiels',         region: 'Scottish Borders', lat: 55.6172, lng: -2.8100 },
  { area: 'ZE',  name: 'Lerwick',            region: 'Shetland',        lat: 60.1547, lng: -1.1494 },

  // Northern Ireland
  { area: 'BT',  name: 'Belfast',            region: 'Northern Ireland', lat: 54.5973, lng: -5.9301 },
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
