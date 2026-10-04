import brazilMap from '@svg-maps/brazil';

export interface BrazilStatePath {
  id: string; // UF: SP, RJ, etc.
  name: string;
  type?: 'path' | 'polygon';
  path?: string;
  points?: string;
  d?: string;
}

export const BRAZIL_ISLANDS: string[] = [];

export const BRAZIL_STATES: BrazilStatePath[] = brazilMap.locations.map((loc) => ({
  id: loc.id.toUpperCase(),
  name: loc.name,
  type: 'path',
  path: loc.path,
  d: loc.path,
}));

export const STATE_CENTROIDS: Record<string, { x: number; y: number; name: string }> = {
  AC: { x: 80, y: 220, name: 'Acre' },
  AL: { x: 575, y: 235, name: 'Alagoas' },
  AP: { x: 350, y: 75, name: 'Amapá' },
  AM: { x: 180, y: 150, name: 'Amazonas' },
  BA: { x: 495, y: 285, name: 'Bahia' },
  CE: { x: 520, y: 140, name: 'Ceará' },
  DF: { x: 410, y: 330, name: 'Distrito Federal' },
  ES: { x: 515, y: 415, name: 'Espírito Santo' },
  GO: { x: 395, y: 345, name: 'Goiás' },
  MA: { x: 440, y: 155, name: 'Maranhão' },
  MT: { x: 290, y: 300, name: 'Mato Grosso' },
  MS: { x: 330, y: 440, name: 'Mato Grosso do Sul' },
  MG: { x: 460, y: 390, name: 'Minas Gerais' },
  PA: { x: 340, y: 160, name: 'Pará' },
  PB: { x: 575, y: 195, name: 'Paraíba' },
  PR: { x: 375, y: 495, name: 'Paraná' },
  PE: { x: 550, y: 215, name: 'Pernambuco' },
  PI: { x: 465, y: 195, name: 'Piauí' },
  RJ: { x: 485, y: 460, name: 'Rio de Janeiro' },
  RN: { x: 575, y: 175, name: 'Rio Grande do Norte' },
  RS: { x: 350, y: 580, name: 'Rio Grande do Sul' },
  RO: { x: 195, y: 280, name: 'Rondônia' },
  RR: { x: 255, y: 55, name: 'Roraima' },
  SC: { x: 385, y: 535, name: 'Santa Catarina' },
  SP: { x: 410, y: 460, name: 'São Paulo' },
  SE: { x: 565, y: 255, name: 'Sergipe' },
  TO: { x: 410, y: 235, name: 'Tocantins' },
};

export function geoToBrazilSvg(lat: number, lng: number): { x: number; y: number } {
  const minLng = -73.98;
  const maxLng = -34.79;
  const minLat = -33.75;
  const maxLat = 5.27;
  const x = ((lng - minLng) / (maxLng - minLng)) * 560 + 25;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 580 + 30;
  return { x: Math.max(10, Math.min(600, x)), y: Math.max(10, Math.min(620, y)) };
}
