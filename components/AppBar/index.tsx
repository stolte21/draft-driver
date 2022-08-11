import { Flex, Heading } from '@chakra-ui/react';
import ColorModeButton from 'components/AppBar/ColorModeButton';
import SettingsButton from 'components/AppBar/SettingsButton';

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
      <SettingsButton />
      <ColorModeButton />
    </Flex>
  </Flex>
);

export default AppBar;
