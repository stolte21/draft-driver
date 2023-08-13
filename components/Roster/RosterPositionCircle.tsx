import { useRef, useEffect } from 'react';
import { useColorMode, Flex, Text, keyframes } from '@chakra-ui/react';
import { Position } from 'types';

type PositionCircleProps = {
  position: Position;
  numPlayers: number;
  total: number;
};

const darkPing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(0, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
`;

const lightPing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(155, 155, 155, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(0, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
`;

const PositionCircle = (props: PositionCircleProps) => {
  const { colorMode } = useColorMode();
  const pingAnimation = `${
    colorMode === 'dark' ? darkPing : lightPing
  } 1s linear`;
  const prevNumPlayers = useRef(props.numPlayers);

  useEffect(() => {
    prevNumPlayers.current = props.numPlayers;
  }, [props.numPlayers]);

  return (
    <Flex
      key={props.position + '-' + props.numPlayers}
      animation={
        prevNumPlayers.current !== props.numPlayers ? pingAnimation : undefined
      }
      flexDirection="column"
      width="40px"
      height="40px"
      justifyContent="center"
      alignItems="center"
      backgroundColor={
        colorMode === 'dark' ? 'blackAlpha.500' : 'blackAlpha.200'
      }
      rounded="full"
      fontSize="xs"
    >
      <Text fontWeight="bold">{props.position}</Text>
      <Text>
        {props.numPlayers}/{props.total}
      </Text>
    </Flex>
  );
};

export default PositionCircle;
