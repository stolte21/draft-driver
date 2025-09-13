import {
  Box,
  Flex,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { ListChildComponentProps } from 'react-window';
import HeartIcon from 'components/Icons/HeartIcon';
import { useDraft } from 'providers/DraftProvider';
import { useSettings } from 'providers/SettingsProvider';
import { Player, Position } from 'types';
import { MouseEventHandler } from 'react';

type DraftBoardRankingRowProps = {
  players: Player[];
};

const getExpectedRound = (
  adp: number,
  numTeams: number,
  rosterSize: Record<Position, number>
): string => {
  if (!adp || adp === 0) return '';

  const round = Math.ceil(adp / numTeams);
  const pickInRound = ((adp - 1) % numTeams) + 1;
  const thirdOfRound = Math.ceil(numTeams / 3);
  const totalPicks = Object.values(rosterSize).reduce((a, b) => a + b, 0);

  if (round > totalPicks) return 'undrafted';

  let position: string;
  if (pickInRound <= thirdOfRound) {
    position = 'early';
  } else if (pickInRound <= thirdOfRound * 2) {
    position = 'mid';
  } else {
    position = 'late';
  }

  const roundSuffix = getRoundSuffix(round);
  return `${position} ${round}${roundSuffix}`;
};

const getRoundSuffix = (round: number): string => {
  if (round >= 11 && round <= 13) return 'th';
  const lastDigit = round % 10;
  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const DraftBoardRankingRow = (
  props: ListChildComponentProps<DraftBoardRankingRowProps>
) => {
  const { getters, dispatch } = useDraft();
  const {
    state: { numTeams, rosterSize },
  } = useSettings();
  const player = props.data.players[props.index];
  const isPlayerDrafted = getters.draftedPlayerIds.has(player.id);
  const isPlayerFavorite = getters.favoritePlayerIds.has(player.id);

  const handleDraftPlayer: MouseEventHandler = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(player.name);
    dispatch({ type: 'draft', payload: player });
  };

  return (
    <Box style={props.style}>
      <Menu placement="auto" isLazy>
        <Flex
          height="100%"
          alignItems="center"
          cursor={isPlayerDrafted ? 'not-allowed' : 'pointer'}
          backgroundColor={
            isPlayerDrafted
              ? 'blackAlpha.800'
              : player.tier && player.tier % 2 === 0
              ? 'blackAlpha.500'
              : undefined
          }
          _hover={{
            backdropFilter: !isPlayerDrafted ? 'brightness(90%)' : undefined,
          }}
        >
          <IconButton
            aria-label={`Draft ${player.name}`}
            icon={<AddIcon />}
            visibility={isPlayerDrafted ? 'hidden' : 'visible'}
            size="xs"
            marginRight={2}
            marginLeft={1}
            isDisabled={isPlayerDrafted}
            isRound
            onClick={handleDraftPlayer}
          />
          <MenuButton
            height="100%"
            width="100%"
            display="flex"
            textAlign="left"
            sx={{
              '& > span': {
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            <Text flexShrink={0} flexBasis={10} textAlign={'right'}>
              {player.position}
              {player.pRank}
            </Text>
            <Text marginLeft={4} flexShrink={0} flexBasis={10}>
              {player.team}
            </Text>
            <Text
              flexGrow={1}
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              textDecoration={isPlayerDrafted ? 'line-through' : 'none'}
            >
              {player.name}
              {player.isRookie && (
                <Text
                  as="span"
                  verticalAlign="super"
                  marginLeft={2}
                  color="blue.200"
                  fontWeight="bold"
                  lineHeight={0}
                >
                  R
                </Text>
              )}
              {isPlayerFavorite && (
                <HeartIcon
                  display="inline-block"
                  verticalAlign="super"
                  color="blue.200"
                  marginLeft={2}
                  fontSize="xs"
                  filled
                />
              )}
            </Text>
            {player.adp && player.adp > 0 && (
              <Text
                display={['none', 'none', 'block']}
                marginRight={2}
                color="whiteAlpha.500"
                fontSize="sm"
              >
                {getExpectedRound(player.adp, numTeams, rosterSize)}
              </Text>
            )}
            {player.vsAdp !== undefined && player.vsAdp !== 0 && (
              <Text
                display={['none', 'none', 'block']}
                marginRight={2}
                color="whiteAlpha.500"
              >
                {player.vsAdp > 0 && '+'}
                {player.vsAdp}
              </Text>
            )}
            {player.tier && (
              <Text
                display={['none', 'none', 'block']}
                marginRight={2}
                color="whiteAlpha.500"
              >
                Tier {player.tier}
              </Text>
            )}
          </MenuButton>
        </Flex>
        <MenuList fontFamily="body">
          <MenuItem
            onClick={() =>
              dispatch({ type: 'toggle-favorite', payload: player.id })
            }
          >
            Toggle Favorite
          </MenuItem>
          <MenuItem
            onClick={() => dispatch({ type: 'add-keeper', payload: player })}
          >
            Add Keeper
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  );
};

export default DraftBoardRankingRow;
