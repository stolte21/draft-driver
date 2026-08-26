import Link from 'next/link';
import {
  Flex,
  Heading,
  Text,
  Container,
  Box,
  Skeleton,
} from '@chakra-ui/react';
import HomeButton from 'components/HomeButton';
import ChartsButton from 'components/ChartsButton';
import AboutButton from 'components/About';
import SettingsButton from 'components/Settings';
import AppBarMenu from './AppBarMenu';
import { useSettings } from 'providers/SettingsProvider';
import { getFormatName } from 'utils';

const AppBar = () => {
  const { state } = useSettings();

  return (
    <Flex
      position="sticky"
      top={0}
      zIndex="sticky"
      backdropFilter="blur(5px)"
      gridColumn="1 / -1"
      paddingY={2}
      paddingX={[3]}
      backgroundColor="blackAlpha.400"
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
          <Heading
            as="p"
            fontSize={{ base: 'lg', md: '2xl' }}
            marginBottom={0.5}
            whiteSpace="nowrap"
          >
            <Link href="/">Draft Driver</Link>
          </Heading>

          <Skeleton isLoaded={state.isHydrated} maxWidth="200px" height={4}>
            <Heading as="p" size="xs" fontWeight="light" whiteSpace="nowrap">
              Rankings:&nbsp;
              <Text as="span" fontWeight="medium">
                Boris Chen {getFormatName(state.format)}
              </Text>
            </Heading>
          </Skeleton>
        </Box>

        <Flex gap={2} display={{ base: 'none', md: 'flex' }}>
          <HomeButton />
          <ChartsButton />
          <SettingsButton />
          <AboutButton />
        </Flex>

        <Box display={{ base: 'block', md: 'none' }}>
          <AppBarMenu />
        </Box>
      </Container>
    </Flex>
  );
};

export default AppBar;
