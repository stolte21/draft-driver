import type { NextPage } from 'next';
import Page from 'components/Page';
import PageLoader from 'components/PageLoader';
import Roster from 'components/Roster';
import Toolbar from 'components/Toolbar';
import DraftBoard from 'components/DraftBoard';
import { useDraft } from 'providers/DraftProvider';

const Index: NextPage = () => {
  const { getters } = useDraft();

  return (
    <Page>
      {getters.isInitializing ? (
        <PageLoader />
      ) : (
        <>
          <Toolbar />
          <DraftBoard />
          <Roster />
        </>
      )}
    </Page>
  );
};

export default Index;
