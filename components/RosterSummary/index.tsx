import { HStack } from '@chakra-ui/react';
import RosterSummaryItem from 'components/RosterSummary/RosterSummaryItem';
import { positionsList } from 'utils';

const RosterSummary = () => (
  <HStack justifyContent="center" marginBottom={2}>
    {positionsList.map((position) => (
      <RosterSummaryItem key={position} position={position} />
    ))}
  </HStack>
);

export default RosterSummary;
