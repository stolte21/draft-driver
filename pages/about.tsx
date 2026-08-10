import type { NextPage } from 'next';
import NextLink from 'next/link';
import {
  Box,
  Container,
  Heading,
  Link,
  ListItem,
  Text,
  UnorderedList,
} from '@chakra-ui/react';
import Page from 'components/Page';
import AppBar from 'components/AppBar';
import JsonLd from 'components/JsonLd';
import { faqPageSchema } from 'utils/structuredData';
import { faqs } from 'data/faq';

const AboutPage: NextPage = () => {
  return (
    <Page
      meta={{
        title: 'About Draft Driver | Free Fantasy Football Draft Tool',
        description:
          'What Draft Driver is, how its tier-based rankings work, and ' +
          'answers to common questions about the free fantasy football ' +
          'draft tool.',
      }}
    >
      <JsonLd schema={faqPageSchema(faqs)} />
      <AppBar />
      <Box overflowY="auto" paddingY={8} paddingX={6}>
        <Container maxW="container.md">
          <Heading as="h1" size="xl" marginBottom={4}>
            About Draft Driver
          </Heading>
          <Text marginBottom={4}>
            Draft Driver is a free fantasy football draft tool built around a
            tier-based draft board. During your draft, mark players as they
            come off the board, favorite the ones you&apos;re targeting, avoid
            the ones you aren&apos;t, and jot per-player notes — while the
            roster panel tracks your team by position in real time.
          </Text>
          <Text marginBottom={4}>
            Rankings and tiers come from{' '}
            <Link
              href="https://www.borischen.co"
              isExternal
              textDecoration="underline"
            >
              Boris Chen
            </Link>
            , whose tiers are generated from FantasyPros expert consensus
            rankings. Draft Driver enriches them with season projections,
            average draft position (ADP), team info, and rookie and injury
            status from the Sleeper API — so you can see at a glance when a
            player is falling past their ADP or sitting alone at the top of a
            tier.
          </Text>
          <Text marginBottom={6}>
            There&apos;s nothing to install and no account to create.{' '}
            <Link
              as={NextLink}
              href="/"
              textDecoration="underline"
              fontWeight="semibold"
            >
              Open the draft board
            </Link>{' '}
            and start drafting.
          </Text>

          <Heading as="h2" size="lg" marginBottom={3}>
            Features
          </Heading>
          <UnorderedList spacing={1} marginBottom={6}>
            <ListItem>
              Tier-based draft board for standard, PPR, and half-PPR scoring
            </ListItem>
            <ListItem>Player search and position filtering</ListItem>
            <ListItem>
              Favorites, avoid list, per-player notes, and keeper support
            </ListItem>
            <ListItem>
              Roster tracking by position with automatic flex and bench
              handling
            </ListItem>
            <ListItem>
              Scarcity-adjusted rankings: re-order the board by value over
              replacement based on your league and roster settings
            </ListItem>
            <ListItem>Injury status indicators and player news</ListItem>
            <ListItem>NFL team depth charts</ListItem>
            <ListItem>Light and dark mode; works great on mobile</ListItem>
            <ListItem>
              Progress saved automatically in your browser — refresh without
              fear
            </ListItem>
          </UnorderedList>

          <Heading as="h2" size="lg" marginBottom={3}>
            Frequently asked questions
          </Heading>
          {faqs.map((faq) => (
            <Box key={faq.question} marginBottom={4}>
              <Heading as="h3" size="sm" marginBottom={1}>
                {faq.question}
              </Heading>
              <Text fontSize="sm">{faq.answer}</Text>
            </Box>
          ))}
        </Container>
      </Box>
    </Page>
  );
};

export default AboutPage;
