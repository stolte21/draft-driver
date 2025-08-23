import type { NextPage } from 'next';
import { Box, Container } from '@chakra-ui/react';
import Page from 'components/Page';
import AppBar from 'components/AppBar';
import { DepthCharts } from 'features/depth-charts/DepthCharts';

/**
 * NOTES:
 *
 * I think it would be an interesting feature to display the depth charts and be able to make educations decisions if in combination
 * of the depth chart we had information about each player like:
 *
 * - ADP
 * - Rankings
 * - Where rookie were drafted
 *
 * Might be able to identify good value picks or sleepers.
 */

export const ChartsPage: NextPage = () => {
  return (
    <Page>
      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
          overflow: hidden;
        }
      `}</style>
      <AppBar />
      <Box height="calc(100vh - 64px)" overflowY="auto" padding={6}>
        <Container maxW="container.xl">
          <DepthCharts />
        </Container>
      </Box>
    </Page>
  );
};

export default ChartsPage;
