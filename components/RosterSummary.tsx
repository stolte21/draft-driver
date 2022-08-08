import { Flex, HStack, Text } from '@chakra-ui/react';
import { useRosterSettings } from 'providers/RosterSettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { positionsList } from 'utils';

const RosterSummary = () => {
  const { state } = useRosterSettings();
  const { state: draftState } = useDraft();
  return (
    <HStack justifyContent="center" marginBottom={2}>
      {positionsList.map((position) => (
        <Flex
          key={position}
          flexDirection="column"
          width="80px"
          height="80px"
          justifyContent="center"
          alignItems="center"
          backgroundColor="blackAlpha.300"
          rounded="md"
        >
          <Text fontWeight="bold">{position}</Text>
          <Text>
            {
              draftState.roster.filter((player) => player.position === position)
                .length
            }
            /{state.rosterSize[position]}
          </Text>
        </Flex>
      ))}
    </HStack>
  );
};

export default RosterSummary;
