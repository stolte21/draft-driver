import Link from 'next/link';
import { useRouter } from 'next/router';
import { IconButton, createIcon } from '@chakra-ui/react';

const ChartIcon = createIcon({
  displayName: 'ChartIcon',
  viewBox: '0 0 512 512',
  path: (
    <path
      fill="white"
      d="M104 496H72a24 24 0 0 1-24-24V328a24 24 0 0 1 24-24h32a24 24 0 0 1 24 24v144a24 24 0 0 1-24 24zm224 0h-32a24 24 0 0 1-24-24V232a24 24 0 0 1 24-24h32a24 24 0 0 1 24 24v240a24 24 0 0 1-24 24zm112 0h-32a24 24 0 0 1-24-24V120a24 24 0 0 1 24-24h32a24 24 0 0 1 24 24v352a24 24 0 0 1-24 24zm-224 0h-32a24 24 0 0 1-24-24V40a24 24 0 0 1 24-24h32a24 24 0 0 1 24 24v432a24 24 0 0 1-24 24z"
    ></path>
  ),
});

const ChartsButton = () => {
  const router = useRouter();
  const isActive = router.pathname === '/depth-charts';

  return (
    <Link href="/depth-charts" passHref>
      <IconButton
        aria-label="depth charts"
        variant="ghost"
        icon={<ChartIcon />}
        as="a"
        _hover={{ bg: 'gray.700' }}
        bg={isActive ? 'gray.700' : 'transparent'}
      />
    </Link>
  );
};

export default ChartsButton;
