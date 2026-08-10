import { describe, it, expect } from 'vitest';
import { webApplicationSchema, faqPageSchema } from 'utils/structuredData';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from 'utils/site';

describe('webApplicationSchema', () => {
  it('describes Draft Driver as a free web application', () => {
    const schema = webApplicationSchema();
    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(webApplicationSchema()))).not.toThrow();
  });
});

describe('faqPageSchema', () => {
  it('maps each FAQ to a schema.org Question', () => {
    const faqs = [
      { question: 'Is it free?', answer: 'Yes.' },
      { question: 'Formats?', answer: 'PPR, half-PPR, standard.' },
    ];
    const schema = faqPageSchema(faqs);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Is it free?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes.' },
    });
  });
});
