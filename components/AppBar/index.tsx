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
import SettingsButton from 'components/Settings';
import { useSettings } from 'providers/SettingsProvider';
import { getFormatName, getRankingsName } from 'utils';

const AppBar = () => {
  const { state } = useSettings();

  return (
    <Flex
      position="sticky"
      top={0}
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
          <Heading fontSize="2xl" marginBottom={0.5} whiteSpace="nowrap">
            <Link href="/">Draft Driver</Link>
          </Heading>

          <Skeleton isLoaded={state.isHydrated} maxWidth="200px" height={4}>
            <Heading as="h2" size="xs" fontWeight="light" whiteSpace="nowrap">
              Rankings:&nbsp;
              <Text as="span" fontWeight="medium">
                {getRankingsName(state.dataSource)}{' '}
                {getFormatName(state.format)}
              </Text>
            </Heading>
          </Skeleton>
        </Box>

        <Flex gap={2}>
          <HomeButton />
          <ChartsButton />
          <SettingsButton />
        </Flex>
      </Container>
    </Flex>
  );
};

export default AppBar;
