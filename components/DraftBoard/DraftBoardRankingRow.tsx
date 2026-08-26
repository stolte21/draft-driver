import {
  Box,
  Flex,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
} from '@chakra-ui/react';
import { AddIcon, NotAllowedIcon } from '@chakra-ui/icons';
import { ListChildComponentProps } from 'react-window';
import HeartIcon from 'components/Icons/HeartIcon';
import NoteIcon from 'components/Icons/NoteIcon';
import { useDraft } from 'providers/DraftProvider';
import { useSettings } from 'providers/SettingsProvider';
import { getInjuryIndicator, formatInjuryDetail } from 'utils/injury';
import { Player, Position } from 'types';
import { MouseEventHandler } from 'react';

type DraftBoardRankingRowProps = {
  players: Player[];
  onEditNote: (player: Player) => void;
  onViewDetails: (player: Player) => void;
};

const getExpectedRound = (
  adp: number,
  numTeams: number,
  rosterSize: Record<Position, number>,
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
  props: ListChildComponentProps<DraftBoardRankingRowProps>,
) => {
  const { state, getters, dispatch } = useDraft();
  const {
    state: { numTeams, rosterSize, useScarcityAdjustment },
  } = useSettings();
  const player = props.data.players[props.index];
  const isPlayerDrafted = getters.draftedPlayerIds.has(player.id);
  const isPlayerFavorite = getters.favoritePlayerIds.has(player.id);
  const isPlayerAvoided = getters.avoidedPlayerIds.has(player.id);
  const playerNote = state.notes[player.id];
  const injuryIndicator = getInjuryIndicator(player.injuryStatus);

  const handleDraftPlayer: MouseEventHandler = (e) => {
    e.stopPropagation();
    // the copy is a convenience — drafting must not fail when clipboard
    // permission is denied (automation, non-focused documents)
    navigator.clipboard.writeText(player.name).catch(() => {});
    dispatch({ type: 'draft', payload: { player } });
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
            opacity={isPlayerAvoided && !isPlayerDrafted ? 0.45 : 1}
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
              {injuryIndicator && player.injuryStatus && (
                <Tooltip
                  label={formatInjuryDetail(
                    player.injuryStatus,
                    player.injuryBodyPart,
                  )}
                >
                  {/* MenuButton wraps children in a pointer-events:none span,
                      so the marker must opt back in for hover to reach it */}
                  <Text
                    as="span"
                    pointerEvents="auto"
                    verticalAlign="super"
                    marginLeft={2}
                    color={injuryIndicator.severe ? 'red.300' : 'yellow.300'}
                    fontWeight="bold"
                    fontSize="xs"
                    lineHeight={0}
                  >
                    {injuryIndicator.label}
                  </Text>
                </Tooltip>
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
              {isPlayerAvoided && (
                <NotAllowedIcon
                  verticalAlign="super"
                  color="red.300"
                  marginLeft={2}
                  fontSize="xs"
                />
              )}
              {playerNote && (
                <Tooltip label={playerNote}>
                  {/* MenuButton wraps children in a pointer-events:none span,
                      so the icon must opt back in for hover to reach it */}
                  <NoteIcon
                    pointerEvents="auto"
                    verticalAlign="super"
                    color="yellow.200"
                    marginLeft={2}
                    fontSize="xs"
                  />
                </Tooltip>
              )}
            </Text>
            {useScarcityAdjustment && (
              <Tooltip label="Original rank before scarcity adjustment">
                <Text
                  pointerEvents="auto"
                  display={['none', 'none', 'none', 'block']}
                  marginRight={2}
                  color="whiteAlpha.500"
                  fontSize="sm"
                >
                  #{player.rank}
                </Text>
              </Tooltip>
            )}
            {player.adp > 0 && (
              <Tooltip label="Projected draft window based on ADP">
                <Text
                  pointerEvents="auto"
                  display={['none', 'none', 'block']}
                  marginRight={2}
                  color="whiteAlpha.500"
                  fontSize="sm"
                >
                  {getExpectedRound(player.adp, numTeams, rosterSize)}
                </Text>
              </Tooltip>
            )}
            {player.vsAdp !== undefined && player.vsAdp !== 0 && (
              <Tooltip
                label={`Ranked ${Math.abs(player.vsAdp)} spot${Math.abs(player.vsAdp) === 1 ? '' : 's'} ${player.vsAdp > 0 ? 'higher' : 'lower'} than ADP`}
              >
                <Text
                  pointerEvents="auto"
                  display={['none', 'none', 'block']}
                  marginRight={2}
                  color="whiteAlpha.500"
                >
                  {player.vsAdp > 0 && '+'}
                  {player.vsAdp}
                </Text>
              </Tooltip>
            )}
            {Boolean(player.tier) && (
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
            {isPlayerFavorite ? 'Unfavorite' : 'Favorite'}
          </MenuItem>
          <MenuItem
            onClick={() =>
              dispatch({ type: 'toggle-avoid', payload: player.id })
            }
          >
            {isPlayerAvoided ? 'Unavoid' : 'Avoid'}
          </MenuItem>
          <MenuItem onClick={() => props.data.onEditNote(player)}>
            {playerNote ? 'Edit Note' : 'Add Note'}
          </MenuItem>
          <MenuItem
            onClick={() => dispatch({ type: 'add-keeper', payload: player })}
          >
            Add as Keeper
          </MenuItem>
          <MenuItem onClick={() => props.data.onViewDetails(player)}>
            View Player Details
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  );
};

export default DraftBoardRankingRow;
