// Maps a normalised brand name to its logo file under /public/brand-logos/.
// Falls back to a generic pump icon for brands we don't have a logo for.

const BRAND_TO_FILE: Record<string, string> = {
  'Asda': 'asda.svg',
  'BP': 'bp.svg',
  'Co-op': 'co-op.svg',
  'Costco': 'costco.svg',
  'Esso': 'esso.svg',
  'Gulf': 'gulf.svg',
  'Jet': 'jet.svg',
  'Maxol': 'maxol.png',
  'Morrisons': 'morrisons.svg',
  'Murco': 'murco.svg',
  "Sainsbury's": 'sainsburys.svg',
  'Shell': 'shell.svg',
  'Spar': 'spar.svg',
  'Tesco': 'tesco.svg',
  'Texaco': 'texaco.svg',
  'Valero': 'valero.svg',
};

const GENERIC = 'generic.svg';

export function getBrandLogo(brand: string | undefined): { src: string; isGeneric: boolean } {
  if (!brand) return { src: `/brand-logos/${GENERIC}`, isGeneric: true };
  const file = BRAND_TO_FILE[brand];
  if (file) return { src: `/brand-logos/${file}`, isGeneric: false };
  return { src: `/brand-logos/${GENERIC}`, isGeneric: true };
}

export function hasBrandLogo(brand: string | undefined): boolean {
  if (!brand) return false;
  return brand in BRAND_TO_FILE;
}
