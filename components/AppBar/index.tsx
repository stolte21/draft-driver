import { Flex, Heading } from '@chakra-ui/react';
import RosterSettingsButton from './RosterSettingsButton';
import ColorModeButton from 'components/AppBar/ColorModeButton';

const AppBar = () => (
  <Flex
    alignItems="center"
    height={12}
    paddingX={4}
    backgroundColor="blackAlpha.400"
    shadow="lg"
  >
    <Heading flexGrow={1} size="lg" whiteSpace="nowrap">
      Draft Driver
    </Heading>
    <Flex gap={2}>
      <RosterSettingsButton />
      <ColorModeButton />
    </Flex>
  </Flex>
);

export default AppBar;
