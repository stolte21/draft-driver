export const SITE_URL = 'https://draft-driver.vercel.app';
export const SITE_NAME = 'Draft Driver';
export const DEFAULT_TITLE = 'Draft Driver | Fantasy Football Draft Tool';
export const DEFAULT_DESCRIPTION =
  'Free fantasy football draft tool with tier-based rankings from Boris Chen, ' +
  'Sleeper projections and ADP, roster tracking, and scarcity-adjusted ' +
  'rankings. Works for PPR, half-PPR, and standard leagues.';
export const OG_IMAGE_URL = `${SITE_URL}/og.png`;

export const canonicalUrl = (pathname: string): string => {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${path}`;
};
