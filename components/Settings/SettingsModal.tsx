import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
} from '@chakra-ui/react';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactElement;
};

const SettingsModal = (props: SettingsModalProps) => {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>{props.children}</ModalBody>

        <ModalFooter>
          <Button onClick={props.onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
