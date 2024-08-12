import type { NextPage } from 'next';
import Page from 'components/Page';
import Roster from 'components/Roster';
import Toolbar from 'components/Toolbar';
import DraftBoard from 'components/DraftBoard';

const Index: NextPage = () => {
  return (
    <Page>
      <Toolbar />
      <DraftBoard />
      <Roster />
    </Page>
  );
};

export default Index;
