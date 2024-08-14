import type { NextPage } from 'next';
import { Grid } from '@chakra-ui/react';
import Page from 'components/Page';
import AppBar from 'components/AppBar';
import Roster from 'components/Roster';
import Toolbar from 'components/Toolbar';
import DraftBoard from 'components/DraftBoard';
import DraftProvider from 'providers/DraftProvider';

const Index: NextPage = () => {
  return (
    <Page>
      <AppBar />
      <DraftProvider>
        <Grid paddingY={2} gridColumn={2} height="100%" templateRows="auto 1fr">
          <Toolbar />
          <DraftBoard />
        </Grid>
        <Roster />
      </DraftProvider>
    </Page>
  );
};

export default Index;
