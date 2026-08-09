import { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Text,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import usePlayerDetails, { NOT_FOUND_ERROR } from 'hooks/usePlayerDetails';
import { Player, PlayerDetails } from 'types';

type PlayerDetailsModalProps = {
  player: Player | null;
  onClose: () => void;
};

function formatHeight(heightIn: number | null): string | null {
  if (heightIn == null) return null;
  return `${Math.floor(heightIn / 12)}'${heightIn % 12}"`;
}

function formatYearsPro(yearsExp: number | null): string | null {
  if (yearsExp == null) return null;
  if (yearsExp === 0) return 'Rookie';
  return `${yearsExp} ${yearsExp === 1 ? 'year' : 'years'}`;
}

// Sleeper's news feed keys sources by machine name. Only these three appear
// in practice today (sampled across the top ~60 players); anything new falls
// back to a title-cased version of the key.
const NEWS_SOURCE_LABELS: Record<string, string> = {
  rotoballer: 'RotoBaller',
  rotowire: 'RotoWire',
  fantasy_pros: 'FantasyPros',
};

function formatNewsSource(source: string): string {
  return (
    NEWS_SOURCE_LABELS[source] ??
    source
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const StatItem = (props: { label: string; value: string | null }) => {
  if (!props.value) return null;
  return (
    <Box>
      <Text fontSize="xs" color="whiteAlpha.700" textTransform="uppercase">
        {props.label}
      </Text>
      <Text>{props.value}</Text>
    </Box>
  );
};

const DetailsBody = (props: { details: PlayerDetails }) => {
  const { details } = props;

  return (
    <>
      {/* paddingRight keeps long names clear of the absolutely-positioned
          close button now that the modal has no header */}
      <Flex gap={4} alignItems="center" paddingRight={8}>
        <Avatar
          size="xl"
          name={details.name}
          src={details.photoUrl}
          backgroundColor="gray.600"
        />
        <Box>
          <Heading size="md">{details.name}</Heading>
          <Text color="whiteAlpha.700">
            {[
              details.team,
              details.position,
              details.number != null ? `#${details.number}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {details.injury && (
            // badges default to nowrap; long body parts must wrap on mobile
            <Badge colorScheme="red" marginTop={1} whiteSpace="normal">
              {details.injury.status}
              {details.injury.bodyPart && ` — ${details.injury.bodyPart}`}
            </Badge>
          )}
        </Box>
      </Flex>

      {details.injury?.notes && (
        <Text fontSize="sm" color="whiteAlpha.700" marginTop={2}>
          {details.injury.notes}
        </Text>
      )}

      <SimpleGrid columns={[2, 3]} spacing={4} marginTop={6}>
        <StatItem
          label="Bye Week"
          value={details.byeWeek != null ? `Week ${details.byeWeek}` : null}
        />
        <StatItem
          label="Age"
          value={details.age != null ? `${details.age}` : null}
        />
        <StatItem label="Height" value={formatHeight(details.heightIn)} />
        <StatItem
          label="Weight"
          value={details.weightLb != null ? `${details.weightLb} lb` : null}
        />
        <StatItem label="College" value={details.college} />
        <StatItem label="Years Pro" value={formatYearsPro(details.yearsExp)} />
        <StatItem
          label="Drafted"
          value={details.rookieYear != null ? `${details.rookieYear}` : null}
        />
        <StatItem
          label="Depth Chart"
          value={
            details.depthChartPosition != null &&
            details.depthChartOrder != null
              ? `${details.depthChartPosition} ${details.depthChartOrder}`
              : null
          }
        />
        <StatItem label="Status" value={details.status} />
      </SimpleGrid>

      {details.news.length > 0 && (
        <>
          <Divider marginY={6} />
          <Heading as="h3" size="sm" marginBottom={4}>
            Recent News
          </Heading>
          <Flex flexDirection="column" gap={5}>
            {details.news.map((item, index) => {
              const body = item.description || item.analysis;
              return (
                <Box key={index}>
                  <Text fontWeight="bold">
                    {item.url?.startsWith('https://') ? (
                      <Link
                        href={item.url}
                        isExternal
                        rel="noopener noreferrer"
                      >
                        {item.title}
                        {/* a nowrap span is required to keep the icon on the
                            same line: browsers allow a break before an inline
                            svg even after a no-break space */}
                        <Box as="span" whiteSpace="nowrap">
                          &nbsp;
                          <ExternalLinkIcon marginBottom={1} />
                        </Box>
                      </Link>
                    ) : (
                      item.title
                    )}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    {formatNewsSource(item.source)}
                    {item.published > 0 &&
                      ` · ${new Date(item.published).toLocaleDateString()}`}
                  </Text>
                  {body && (
                    <Text fontSize="sm" marginTop={1} noOfLines={4}>
                      {body}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Flex>
        </>
      )}
    </>
  );
};

const LoadingBody = () => (
  <>
    <Flex gap={4} alignItems="center">
      <SkeletonCircle size="24" />
      <Box flexGrow={1}>
        <Skeleton height={5} width="60%" marginBottom={2} />
        <Skeleton height={4} width="40%" />
      </Box>
    </Flex>
    <SkeletonText marginTop={6} noOfLines={4} spacing={4} />
  </>
);

const FallbackBody = (props: { player: Player }) => (
  <>
    <Text>
      {[props.player.team, props.player.position]
        .filter(Boolean)
        .join(' · ')}
    </Text>
    <Text color="whiteAlpha.700" marginTop={2}>
      No additional details found for this player.
    </Text>
  </>
);

const PlayerDetailsModal = (props: PlayerDetailsModalProps) => {
  const [displayPlayer, setDisplayPlayer] = useState<Player | null>(null);

  // keep the last player around solely so the body persists through
  // Chakra's close animation after `player` goes back to null — the
  // query hook itself keys off `activePlayer` (below), not this directly
  useEffect(() => {
    if (props.player) {
      setDisplayPlayer(props.player);
    }
  }, [props.player]);

  // props.player is the source of truth while the modal is open; once it
  // goes back to null (close animation), fall back to the last known
  // player so the body doesn't flash blank/stale mid-transition.
  const activePlayer = props.player ?? displayPlayer;

  const query = usePlayerDetails(activePlayer);
  const isNotFound =
    query.error instanceof Error && query.error.message === NOT_FOUND_ERROR;

  return (
    <Modal
      isOpen={props.player !== null}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      {/* no ModalHeader — the body's player card is the title, so the modal
          is labeled for assistive tech via aria-label instead */}
      <ModalContent
        aria-label={
          activePlayer ? `Player details: ${activePlayer.name}` : 'Player details'
        }
      >
        <ModalCloseButton />
        <ModalBody paddingY={6}>
          {query.isLoading && <LoadingBody />}
          {query.data ? (
            <DetailsBody details={query.data} />
          ) : (
            query.error &&
            activePlayer && (
              <>
                <Heading size="md" marginBottom={2} paddingRight={8}>
                  {activePlayer.name}
                </Heading>
                {isNotFound ? (
                  <FallbackBody player={activePlayer} />
                ) : (
                  <Text color="whiteAlpha.700">
                    There was an error fetching player details.
                  </Text>
                )}
              </>
            )
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PlayerDetailsModal;
