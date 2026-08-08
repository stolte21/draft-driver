import { IconButton, createIcon, useDisclosure } from '@chakra-ui/react';
import AboutModal from './AboutModal';

const InfoIcon = createIcon({
  displayName: 'InfoIcon',
  viewBox: '0 0 24 24',
  path: (
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
    ></path>
  ),
});

const About = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <IconButton
        aria-label="about"
        variant="ghost"
        icon={<InfoIcon />}
        onClick={onOpen}
      />
      <AboutModal isOpen={isOpen} onClose={onClose} />
    </>
  );
};

export default About;
