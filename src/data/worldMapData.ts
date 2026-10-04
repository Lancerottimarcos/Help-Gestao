import worldMap from '@svg-maps/world';

export interface WorldCountryPath {
  id: string;
  name: string;
  d?: string;
  path?: string;
  region?: string;
}

export const WORLD_COUNTRIES: WorldCountryPath[] = worldMap.locations.map((loc) => ({
  id: loc.id,
  name: loc.name,
  d: loc.path,
  path: loc.path,
}));

export function geoToWorldSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x: Math.max(0, Math.min(1000, x)), y: Math.max(0, Math.min(500, y)) };
}

export const GLOBAL_CITIES: Record<string, { name: string; country: string; lat: number; lng: number }> = {
  lisboa: { name: 'Lisboa', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  porto: { name: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291 },
  miami: { name: 'Miami', country: 'EUA', lat: 25.7617, lng: -80.1918 },
  'new york': { name: 'Nova York', country: 'EUA', lat: 40.7128, lng: -74.0060 },
  'nova york': { name: 'Nova York', country: 'EUA', lat: 40.7128, lng: -74.0060 },
  orlando: { name: 'Orlando', country: 'EUA', lat: 28.5383, lng: -81.3792 },
  londres: { name: 'Londres', country: 'Reino Unido', lat: 51.5074, lng: -0.1278 },
  madri: { name: 'Madri', country: 'Espanha', lat: 40.4168, lng: -3.7038 },
  'buenos aires': { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  santiago: { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
};

export const GLOBAL_COUNTRIES_FALLBACK: Record<string, { country: string; defaultCity: string; lat: number; lng: number }> = {
  portugal: { country: 'Portugal', defaultCity: 'Lisboa', lat: 38.7223, lng: -9.1393 },
  pt: { country: 'Portugal', defaultCity: 'Lisboa', lat: 38.7223, lng: -9.1393 },
  eua: { country: 'EUA', defaultCity: 'Miami', lat: 25.7617, lng: -80.1918 },
  usa: { country: 'EUA', defaultCity: 'Miami', lat: 25.7617, lng: -80.1918 },
  us: { country: 'EUA', defaultCity: 'Miami', lat: 25.7617, lng: -80.1918 },
  'estados unidos': { country: 'EUA', defaultCity: 'Miami', lat: 25.7617, lng: -80.1918 },
  espanha: { country: 'Espanha', defaultCity: 'Madri', lat: 40.4168, lng: -3.7038 },
  es: { country: 'Espanha', defaultCity: 'Madri', lat: 40.4168, lng: -3.7038 },
  'reino unido': { country: 'Reino Unido', defaultCity: 'Londres', lat: 51.5074, lng: -0.1278 },
  uk: { country: 'Reino Unido', defaultCity: 'Londres', lat: 51.5074, lng: -0.1278 },
  argentina: { country: 'Argentina', defaultCity: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  ar: { country: 'Argentina', defaultCity: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  chile: { country: 'Chile', defaultCity: 'Santiago', lat: -33.4489, lng: -70.6693 },
  cl: { country: 'Chile', defaultCity: 'Santiago', lat: -33.4489, lng: -70.6693 },
};
