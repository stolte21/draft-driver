import { Flex, Heading, useColorMode } from '@chakra-ui/react';
import ColorModeButton from 'components/AppBar/ColorModeButton';
import SettingsButton from 'components/AppBar/SettingsButton';

const AppBar = () => {
  const { colorMode } = useColorMode();
  return (
    <Flex
      alignItems="center"
      height={12}
      paddingX={4}
      backgroundColor={colorMode === 'dark' ? 'blackAlpha.400' : 'gray.300'}
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
};

export default AppBar;
