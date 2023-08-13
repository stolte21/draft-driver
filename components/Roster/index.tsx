import { Box, useDisclosure, useColorMode } from '@chakra-ui/react';
import RosterSummary from 'components/Roster/RosterSummary';
import RosterDetail from 'components/Roster/RosterDetail';

const OFFSET_HEIGHT = '50px';
const OPEN_HEIGHT = '85svh';

const Roster = () => {
  const { colorMode } = useColorMode();
  const { isOpen, onToggle } = useDisclosure();

  return (
    <>
      {/* This is to take up some space to push the content above it up */}
      <Box height={OFFSET_HEIGHT}></Box>
      <Box
        height={isOpen ? OPEN_HEIGHT : OFFSET_HEIGHT}
        width="100vw"
        minWidth="320px"
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        paddingTop={1}
        backgroundColor={colorMode === 'dark' ? 'gray.900' : '#d6d6d6'}
        borderTopLeftRadius={12}
        borderTopRightRadius={12}
        cursor="pointer"
        transition="0.35s height"
        boxShadow="dark-lg"
        onClick={onToggle}
      >
        <RosterSummary />
        <RosterDetail />
      </Box>
    </>
  );
};

export default Roster;
