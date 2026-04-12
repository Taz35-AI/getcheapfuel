export interface FuelPrices {
  E10?: number | null;  // Standard Unleaded
  E5?: number | null;   // Premium Unleaded
  B7?: number | null;   // Standard Diesel
  SDV?: number | null;  // Super Diesel
}

export interface DayHours {
  open_time?: string;     // "06:00:00" format
  close_time?: string;    // "22:00:00" format
  is_24_hours?: boolean;
}

export interface OpeningHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
  bank_holiday?: DayHours;
}

export interface StationAmenities {
  twenty_four_hour_fuel?: boolean;
  adblue_pumps?: boolean;
  adblue_packaged?: boolean;
  lpg_pumps?: boolean;
  car_wash?: boolean;
  air_pump_or_screenwash?: boolean;
  water_filling?: boolean;
  customer_toilets?: boolean;
}

// Per-fuel "actual update time" timestamps from the retailer feed.
// These reflect when each price last changed at the pump, not when our
// cron last ran. Used to display freshness badges in the UI.
export interface PriceUpdatedAt {
  E10?: string | null;
  E5?: string | null;
  B7?: string | null;
  SDV?: string | null;
}

export interface FuelStation {
  id: string;
  brand: string;
  name: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  prices: FuelPrices;
  lastUpdated?: string;
  priceUpdatedAt?: PriceUpdatedAt;
  source: 'fuelfinder';
  openingHours?: OpeningHours;
  amenities?: StationAmenities;
}

export interface EVCharger {
  id: string;
  title: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  connections: EVConnection[];
  operator: string;
  usageCost?: string;
  isOperational: boolean;
  source: 'ocm';
}

export interface EVConnection {
  type: string;
  powerKW: number;
  quantity: number;
  status: string;
}

export type FuelType = 'E10' | 'E5' | 'B7' | 'SDV' | 'EV';

export const FUEL_LABELS: Record<FuelType, string> = {
  E10: 'Unleaded (E10)',
  E5: 'Premium Unleaded (E5)',
  B7: 'Diesel (B7)',
  SDV: 'Super Diesel',
  EV: 'EV Charging',
};

export const FUEL_COLORS: Record<FuelType, string> = {
  E10: '#22c55e',
  E5: '#3b82f6',
  B7: '#f59e0b',
  SDV: '#ef4444',
  EV: '#8b5cf6',
};
