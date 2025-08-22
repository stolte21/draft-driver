import { useState, TransitionEventHandler } from 'react';
import {
  Box,
  IconButton,
  useDisclosure,
  useBreakpoint,
  BoxProps,
} from '@chakra-ui/react';
import { ChevronUpIcon } from '@chakra-ui/icons';
import RosterSummary from 'components/Roster/RosterSummary';
import RosterDetail from 'components/Roster/RosterDetail';

const OFFSET_HEIGHT = '50px';
const OPEN_HEIGHT_DESKTOP = '40vh';
const OPEN_HEIGHT_MOBILE = '75lvh';

const Roster = () => {
  const bp = useBreakpoint();
  const { isOpen, onToggle } = useDisclosure();
  const [isScroll, setScroll] = useState(false);
  const isXS = bp === 'base';
  const openHeight = isXS ? OPEN_HEIGHT_MOBILE : OPEN_HEIGHT_DESKTOP;

  const boxProps: BoxProps = isXS
    ? {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        cursor: 'pointer',
        onClick: onToggle,
      }
    : {
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
      };

  const handleChevronClick = () => {
    setScroll(false);
    onToggle();
  };

  const toggleScroll: TransitionEventHandler<HTMLDivElement> = (e) => {
    if (e.propertyName === 'height') {
      setScroll(isOpen);
    }
  };

  return (
    <>
      {/* This is to take up some space to push the content above it up in mobile views */}
      {isXS && <Box height={OFFSET_HEIGHT}></Box>}
      <Box
        gridColumn={2}
        display="flex"
        flexDirection="column"
        height={isOpen ? openHeight : OFFSET_HEIGHT}
        width="100vw"
        minWidth="320px"
        paddingTop={1}
        backgroundColor="gray.900"
        transition="0.35s height"
        boxShadow="lg"
        onTransitionEnd={toggleScroll}
        {...boxProps}
      >
        <RosterSummary />
        <RosterDetail overflow={isScroll ? 'auto' : 'hidden'} />
        {!isXS && (
          <IconButton
            aria-label="toggle roster detail size"
            position="absolute"
            variant="ghost"
            size="md"
            top={1}
            right={2}
            icon={<ChevronUpIcon />}
            transform={isOpen ? 'rotate(180deg)' : ''}
            onClick={handleChevronClick}
          />
        )}
      </Box>
    </>
  );
};

export default Roster;
