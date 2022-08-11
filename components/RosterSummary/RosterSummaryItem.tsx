import { useRef, useEffect } from 'react';
import { useColorMode, Flex, Text, keyframes } from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';
import { Position } from 'types';

type RosterSummaryItemProps = {
  position: Position;
};

const ping = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(0, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
`;

const pingAnimation = `${ping} 1s linear`;

const RosterSummaryItem = (props: RosterSummaryItemProps) => {
  const { colorMode } = useColorMode();
  const { state } = useSettings();
  const { state: draftState } = useDraft();
  const numInPosition = draftState.roster.filter(
    (player) => player.position === props.position
  ).length;
  const lastNumInPosition = useRef(numInPosition);

  useEffect(() => {
    lastNumInPosition.current = numInPosition;
  }, [numInPosition]);

  return (
    <Flex
      key={props.position + '-' + numInPosition}
      animation={
        lastNumInPosition.current !== numInPosition ? pingAnimation : undefined
      }
      flexDirection="column"
      width={['40px', '80px']}
      height={['40px', '80px']}
      justifyContent="center"
      alignItems="center"
      backgroundColor={colorMode === 'dark' ? 'blackAlpha.300' : 'gray.200'}
      rounded={['full', 'md']}
      fontSize={['xs', 'md']}
    >
      <Text fontWeight="bold">{props.position}</Text>
      <Text>
        {numInPosition}/{state.rosterSize[props.position]}
      </Text>
    </Flex>
  );
};

export default RosterSummaryItem;
