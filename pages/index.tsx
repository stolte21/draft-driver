import type { NextPage } from 'next';
import { Grid, Box, VisuallyHidden } from '@chakra-ui/react';
import Page from 'components/Page';
import AppBar from 'components/AppBar';
import Roster from 'components/Roster';
import Toolbar from 'components/Toolbar';
import DraftBoard from 'components/DraftBoard';
import StaleRankingsBanner from 'components/StaleRankingsBanner';
import JsonLd from 'components/JsonLd';
import { webApplicationSchema } from 'utils/structuredData';

const Index: NextPage = () => {
  return (
    <Page>
      <JsonLd schema={webApplicationSchema()} />
      <VisuallyHidden as="h1">
        Draft Driver fantasy football draft board
      </VisuallyHidden>
      <AppBar />
      <Grid
        paddingY={2}
        gridColumn={2}
        height="100%"
        templateRows="auto auto 1fr"
      >
        <Toolbar />
        <StaleRankingsBanner />
        {/*
          StaleRankingsBanner renders `null` when there's nothing to show, which
          removes it as a grid item entirely. Without an explicit row, CSS grid
          auto-placement would then shift DraftBoard into the empty "auto" row
          instead of the "1fr" row, collapsing it to a sliver. Pin it to row 3
          explicitly so it always fills the remaining height.
        */}
        <Box gridRow={3} minHeight={0} height="100%">
          <DraftBoard />
        </Box>
      </Grid>
      <Roster />
    </Page>
  );
};

export default Index;
