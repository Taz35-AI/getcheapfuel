export interface FuelPrices {
  E10?: number | null;  // Standard Unleaded
  E5?: number | null;   // Premium Unleaded
  B7?: number | null;   // Standard Diesel
  SDV?: number | null;  // Super Diesel
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
  source: 'cma' | 'fuelfinder';
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
