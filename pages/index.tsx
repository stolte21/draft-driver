import type { NextPage } from 'next';
import Page from 'components/Page';
import PageLoader from 'components/PageLoader';
import RosterSummary from 'components/RosterSummary';
import Toolbar from 'components/Toolbar';
import DraftBoard from 'components/DraftBoard';
import { useDraft } from 'providers/DraftProvider';

const Index: NextPage = () => {
  const { computed } = useDraft();

  return (
    <Page>
      {computed.isInitializing ? (
        <PageLoader />
      ) : (
        <>
          <RosterSummary />
          <Toolbar />
          <DraftBoard />
        </>
      )}
    </Page>
  );
};

export default Index;
