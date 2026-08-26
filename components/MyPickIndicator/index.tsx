import { Box, keyframes } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';

const pulse = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.75; }
`;

/**
 * Shown while the next overall pick belongs to the user (per the draft
 * position setting): a soft frame around the viewport plus a banner.
 *
 * Nothing shows until the first pick is in. There's no concept of a draft
 * "starting", so whoever holds 1.1 would otherwise sit under a lit-up app
 * from the moment they open it, which reads as noise rather than a cue.
 * Auto-rostering still covers that first pick; only the indicator waits.
 */
const MyPickIndicator = () => {
  const { state, getters } = useDraft();

  if (!getters.isMyPick || state.draftedPlayers.length === 0) return null;

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        zIndex="banner"
        pointerEvents="none"
        /* a crisp ring reads the same thickness on every edge; the bloom
           behind it stays narrow, since a wide inset blur piles up where
           two edges meet and leaves the corners far brighter than the
           middle of each side */
        boxShadow="inset 0 0 0 2px var(--chakra-colors-blue-400), inset 0 0 16px 0 var(--chakra-colors-blue-400)"
        animation={`${pulse} 2.4s ease-in-out infinite`}
        sx={{
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 0.55,
          },
        }}
        aria-hidden
      />
      {/* role=status announces the turn to screen readers, which the glow
          alone can't do */}
      <Box
        role="status"
        position="fixed"
        /* the app bar's middle is empty at sm and up. On mobile it isn't,
           and everything below it (search, filters, board) is load-bearing
           during a pick, so the banner sits just above the roster bar
           instead of covering any of it. */
        top={['auto', 5]}
        bottom={['58px', 'auto']}
        left="50%"
        transform="translateX(-50%)"
        zIndex="banner"
        pointerEvents="none"
        paddingX={3}
        paddingY={1}
        borderRadius="full"
        backgroundColor="blue.400"
        color="gray.900"
        fontSize="sm"
        fontWeight="bold"
        whiteSpace="nowrap"
        boxShadow="lg"
      >
        You&apos;re up!
      </Box>
    </>
  );
};

export default MyPickIndicator;
