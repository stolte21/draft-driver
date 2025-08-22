import type { NextPage } from 'next';
import Page from 'components/Page';
import AppBar from 'components/AppBar';

export const ChartsPage: NextPage = () => {
  return (
    <Page>
      <AppBar />
      <div>Charts Page!</div>
    </Page>
  );
};

export default ChartsPage;
