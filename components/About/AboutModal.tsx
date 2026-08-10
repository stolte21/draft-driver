import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex,
  Heading,
  Link,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useDraft } from 'providers/DraftProvider';

type AboutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AboutModal = (props: AboutModalProps) => {
  const { getters } = useDraft();
  const lastModified = getters.rankingsLastModified;
  const formatted = lastModified
    ? new Date(lastModified).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>About Draft Driver</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={4}>
            <div>
              <Heading as="h3" size="sm" marginBottom={1}>
                How it works
              </Heading>
              <Text fontSize="sm">
                Draft Driver is a fantasy football draft assistant built
                around a tier-based draft board. Mark players as drafted,
                favorite or avoid them, and jot per-player notes while the
                roster panel tracks your team by position. Turn on
                Scarcity-Adjusted Rankings in settings to re-order the board
                by value over replacement, computed from your roster sizes
                and league size. All draft state is saved locally in your
                browser.
              </Text>
            </div>
            <div>
              <Heading as="h3" size="sm" marginBottom={1}>
                Data &amp; credits
              </Heading>
              <Text fontSize="sm">
                Tiers and rankings come from{' '}
                <Link
                  href="https://www.borischen.co"
                  isExternal
                  textDecoration="underline"
                >
                  Boris Chen
                </Link>
                , whose tiers are built on FantasyPros expert consensus
                rankings. Season projections, ADP, team info, and rookie
                flags come from the Sleeper API.
                {formatted && <> Rankings were last updated {formatted}.</>}
              </Text>
            </div>
          </Flex>
        </ModalBody>

        <ModalFooter gap={3}>
          <Link
            as={NextLink}
            href="/about"
            fontSize="sm"
            textDecoration="underline"
            onClick={props.onClose}
          >
            Learn more
          </Link>
          <Button onClick={props.onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AboutModal;
