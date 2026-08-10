import { describe, it, expect } from 'vitest';
import { SITE_URL, canonicalUrl } from 'utils/site';

describe('canonicalUrl', () => {
  it('returns the site root with a trailing slash for the homepage', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
  });

  it('appends the pathname for subpages', () => {
    expect(canonicalUrl('/about')).toBe(`${SITE_URL}/about`);
  });

  it('strips trailing slashes from subpage paths', () => {
    expect(canonicalUrl('/about/')).toBe(`${SITE_URL}/about`);
  });
});
