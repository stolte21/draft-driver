import { Box, VStack, useColorModeValue } from '@chakra-ui/react';

export type TeamIndexRailProps = {
  teams: string[];
  activeTeam: string | null;
  onSelect: (team: string) => void;
};

export function TeamIndexRail(props: TeamIndexRailProps) {
  const activeColor = useColorModeValue('blue.600', 'blue.300');
  const inactiveColor = 'gray.500';

  return (
    <VStack
      as="nav"
      aria-label="Jump to team"
      position="fixed"
      right={4}
      // center within the content area below the 64px AppBar, clear of the
      // scroll container's scrollbar
      top="calc(50% + 32px)"
      transform="translateY(-50%)"
      spacing={0}
      zIndex={30}
      display={{ base: 'none', md: 'flex' }}
    >
      {props.teams.map((team) => {
        const isActive = team === props.activeTeam;

        return (
          <Box
            as="button"
            key={team}
            onClick={() => props.onSelect(team)}
            fontSize="10px"
            lineHeight="1.6"
            px={1}
            fontWeight={isActive ? 'bold' : 'normal'}
            color={isActive ? activeColor : inactiveColor}
            _hover={{ color: activeColor }}
          >
            {team}
          </Box>
        );
      })}
    </VStack>
  );
}

export default TeamIndexRail;
