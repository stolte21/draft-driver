import { Flex, HStack, Text } from '@chakra-ui/react';
import { useRosterSettings } from 'providers/RosterSettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import RosterSummaryItem from 'components/RosterSummary/RosterSummaryItem';
import { positionsList } from 'utils';

const RosterSummary = () => {
  const { state } = useRosterSettings();
  const { state: draftState } = useDraft();
  return (
    <HStack justifyContent="center" marginBottom={2}>
      {positionsList.map((position) => (
        <RosterSummaryItem key={position} position={position} />
      ))}
    </HStack>
  );
};

export default RosterSummary;
