import {
  Flex,
  Heading,
  Text,
  Container,
  useColorMode,
  Box,
} from '@chakra-ui/react';
import ColorModeButton from 'components/AppBar/ColorModeButton';
import SettingsButton from 'components/AppBar/SettingsButton';
import { useSettings } from 'providers/SettingsProvider';
import { getFormatName, getRankingsName } from 'utils';

const AppBar = () => {
  const { colorMode } = useColorMode();
  const { state } = useSettings();

  return (
    <Flex
      gridColumn="1 / -1"
      paddingY={2}
      paddingX={[3]}
      position="relative"
      backgroundColor={
        colorMode === 'dark' ? 'blackAlpha.400' : 'blackAlpha.300'
      }
      shadow="lg"
    >
      <Container
        display="flex"
        alignItems="center"
        maxW="container.xl"
        margin="auto"
        paddingX={0}
      >
        <Box flexGrow={1}>
          <Heading fontSize="2xl" marginBottom={0.5} whiteSpace="nowrap">
            Draft Driver
          </Heading>
          <Heading as="h2" size="xs" fontWeight="light">
            Rankings:&nbsp;
            <Text as="span" fontWeight="medium">
              {getRankingsName(state.dataSource)} {getFormatName(state.format)}
            </Text>
          </Heading>
        </Box>

        <Flex gap={2}>
          <SettingsButton />
          <ColorModeButton />
        </Flex>
      </Container>
    </Flex>
  );
};

export default AppBar;
