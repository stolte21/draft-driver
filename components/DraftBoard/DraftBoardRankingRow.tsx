import {
  Box,
  Flex,
  Text,
  IconButton,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { ListChildComponentProps } from 'react-window';
import HeartIcon from 'components/Icons/HeartIcon';
import { useDraft } from 'providers/DraftProvider';
import { Player } from 'types';
import { MouseEventHandler } from 'react';

type DraftBoardRankingRowProps = {
  players: Player[];
};

const DraftBoardRankingRow = (
  props: ListChildComponentProps<DraftBoardRankingRowProps>
) => {
  const { colorMode } = useColorMode();
  const { getters, dispatch } = useDraft();
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
              ? colorMode === 'dark'
                ? 'blackAlpha.800'
                : 'blackAlpha.700'
              : player.tier && player.tier % 2 === 0
              ? colorMode === 'dark'
                ? 'blackAlpha.500'
                : 'blackAlpha.400'
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
            <Text flexShrink={0} marginLeft={1} flexBasis={10}>
              {player.rank}
            </Text>
            <Text flexShrink={0} flexBasis={10}>
              {player.team}
            </Text>
            <Text flexShrink={0} flexBasis={10}>
              {player.position}
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
            {player.vsAdp !== undefined && player.vsAdp !== 0 && (
              <Text
                display={['none', 'none', 'block']}
                marginRight={2}
                color={
                  colorMode === 'dark' ? 'whiteAlpha.500' : 'blackAlpha.700'
                }
              >
                {player.vsAdp > 0 && '+'}
                {player.vsAdp}
              </Text>
            )}
            {player.tier && (
              <Text
                display={['none', 'none', 'block']}
                marginRight={2}
                color={
                  colorMode === 'dark' ? 'whiteAlpha.500' : 'blackAlpha.700'
                }
              >
                Tier {player.tier}
              </Text>
            )}
          </MenuButton>
        </Flex>
        <MenuList>
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
