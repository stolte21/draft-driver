import { Box, keyframes } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';

const pulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
`;

/**
 * Full-viewport pulsing glow shown while the next overall pick belongs to
 * the user (per the draft position setting). Purely decorative: it never
 * intercepts pointer events and is hidden from assistive tech.
 */
const MyPickIndicator = () => {
  const { getters } = useDraft();

  if (!getters.isMyPick) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex="banner"
      pointerEvents="none"
      boxShadow="inset 0 0 42px 10px var(--chakra-colors-blue-400)"
      animation={`${pulse} 1.6s ease-in-out infinite`}
      sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
      aria-hidden
    />
  );
};

export default MyPickIndicator;
