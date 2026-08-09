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
  ModalHeader,
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

const StatItem = (props: { label: string; value: string | null }) => {
  if (props.value == null) return null;
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" textTransform="uppercase">
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
      <Flex gap={4} alignItems="center">
        <Avatar
          size="xl"
          name={details.name}
          src={details.photoUrl}
          backgroundColor="gray.600"
        />
        <Box>
          <Heading size="md">{details.name}</Heading>
          <Text color="gray.500">
            {[
              details.team,
              details.position,
              details.number != null ? `#${details.number}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {details.injury && (
            <Badge colorScheme="red" marginTop={1}>
              {details.injury.status}
              {details.injury.bodyPart && ` — ${details.injury.bodyPart}`}
            </Badge>
          )}
        </Box>
      </Flex>

      {details.injury?.notes && (
        <Text fontSize="sm" color="gray.500" marginTop={2}>
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
          <Heading size="sm" marginBottom={4}>
            Recent News
          </Heading>
          <Flex flexDirection="column" gap={5}>
            {details.news.map((item, index) => (
              <Box key={index}>
                <Text fontWeight="bold">
                  {item.url?.startsWith('https://') ? (
                    <Link href={item.url} isExternal>
                      {item.title} <ExternalLinkIcon marginX={1} />
                    </Link>
                  ) : (
                    item.title
                  )}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {item.source}
                  {item.published > 0 &&
                    ` · ${new Date(item.published).toLocaleDateString()}`}
                </Text>
                {(item.description || item.analysis) && (
                  <Text fontSize="sm" marginTop={1} noOfLines={4}>
                    {item.description ?? item.analysis}
                  </Text>
                )}
              </Box>
            ))}
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
    <Text color="gray.500" marginTop={2}>
      No additional details found for this player.
    </Text>
  </>
);

const PlayerDetailsModal = (props: PlayerDetailsModalProps) => {
  const [displayPlayer, setDisplayPlayer] = useState<Player | null>(null);

  // keep the last player around so the modal doesn't blank out while
  // Chakra plays the close animation after `player` goes back to null —
  // the query hook also keys off displayPlayer for the same reason
  useEffect(() => {
    if (props.player) {
      setDisplayPlayer(props.player);
    }
  }, [props.player]);

  const query = usePlayerDetails(displayPlayer);
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
      <ModalContent>
        <ModalHeader>Player Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody paddingBottom={6}>
          {query.isLoading && <LoadingBody />}
          {query.data && <DetailsBody details={query.data} />}
          {query.error && displayPlayer && (
            <>
              <Heading size="md" marginBottom={2}>
                {displayPlayer.name}
              </Heading>
              {isNotFound ? (
                <FallbackBody player={displayPlayer} />
              ) : (
                <Text color="gray.500">
                  There was an error fetching player details.
                </Text>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PlayerDetailsModal;
