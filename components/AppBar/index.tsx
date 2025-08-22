import Link from 'next/link';
import {
  Flex,
  Heading,
  Text,
  Container,
  Box,
  Skeleton,
  useColorMode,
} from '@chakra-ui/react';
import ChartsButton from 'components/ChartsButton/ChartsButton';
import ColorModeButton from 'components/ColorMode';
import SettingsButton from 'components/Settings';
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
            <Link href="/">Draft Driver</Link>
          </Heading>

          <Skeleton isLoaded={state.isHydrated} maxWidth="200px" height={4}>
            <Heading as="h2" size="xs" fontWeight="light">
              Rankings:&nbsp;
              <Text as="span" fontWeight="medium">
                {getRankingsName(state.dataSource)}{' '}
                {getFormatName(state.format)}
              </Text>
            </Heading>
          </Skeleton>
        </Box>

        <Flex gap={2}>
          <SettingsButton />
          <ColorModeButton />
          <ChartsButton />
        </Flex>
      </Container>
    </Flex>
  );
};

export default AppBar;
