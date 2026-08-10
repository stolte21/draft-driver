import type { Faq } from 'utils/structuredData';

// Single source of truth: renders as visible FAQ HTML on /about AND as
// FAQPage JSON-LD. Keeping them identical matters — Google penalizes FAQ
// markup that doesn't match visible content.
export const faqs: Faq[] = [
  {
    question: 'Is Draft Driver free?',
    answer:
      'Yes. Draft Driver is completely free. No account, sign-up, or payment is required.',
  },
  {
    question: 'Which scoring formats are supported?',
    answer:
      'Standard, PPR, and half-PPR. Rankings, tiers, and ADP all adjust to the format you pick in settings.',
  },
  {
    question: 'Where do the rankings come from?',
    answer:
      'Tiers and rankings come from Boris Chen, whose tiers are built from FantasyPros expert consensus rankings. Season projections, average draft position (ADP), team info, and rookie and injury status come from the Sleeper API.',
  },
  {
    question: 'How up to date is the data?',
    answer:
      'Rankings are synced regularly throughout draft season, and Sleeper projections refresh daily. The About dialog in the app shows when rankings were last updated.',
  },
  {
    question: 'Does it work on mobile?',
    answer:
      'Yes. The draft board, roster panel, and settings are all designed to work well on phones and tablets.',
  },
  {
    question: 'Where is my draft data stored?',
    answer:
      'Everything you do, including drafted players, your roster, favorites, notes, keepers, and settings, is saved in your browser via localStorage. Nothing is sent to a server, and refreshing the page keeps your progress.',
  },
  {
    question: 'What are scarcity-adjusted rankings?',
    answer:
      'An optional setting that re-orders players by value over replacement (VORP), computed from your league size and roster configuration, then rebuilds tiers from the value gaps. It highlights positional scarcity instead of raw rank.',
  },
];
