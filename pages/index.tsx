import type { NextPage } from 'next';
import { Flex } from '@chakra-ui/react';
import Page from 'components/Page';
import RosterSummary from 'components/RosterSummary';
import FormatSelect from 'components/FormatSelect';
import PlayerFilter from 'components/PlayerFilter';
import DraftBoard from 'components/DraftBoard';
import { useDraft } from 'providers/DraftProvider';

const Index: NextPage = () => {
  const { state, dispatch } = useDraft();

  return (
    <Page>
      <RosterSummary />
      <Flex flexDirection={['column', 'row']} gap={[1, 2]}>
        <FormatSelect
          format={state.format}
          onSelect={(f) => dispatch({ type: 'change-format', payload: f })}
        />
        <PlayerFilter
          filter={state.filter}
          onChange={(f) => dispatch({ type: 'update-filter', payload: f })}
        />
      </Flex>
      <DraftBoard />
    </Page>
  );
};

export default Index;
