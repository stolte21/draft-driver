import { Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useDraft } from 'providers/DraftProvider';

const pulse = keyframes`
  0%, 100% { box-shadow: inset 0 0 18px 4px var(--chakra-colors-blue-400); }
  50% { box-shadow: inset 0 0 42px 10px var(--chakra-colors-blue-400); }
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
      animation={`${pulse} 1.6s ease-in-out infinite`}
      aria-hidden
    />
  );
};

export default MyPickIndicator;
