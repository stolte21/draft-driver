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
  Divider,
} from '@chakra-ui/react';
import SettingsFormat from './SettingsFormat';
import SettingsHidePlayersSwitch from './SettingsHidePlayersSwitch';
import SettingsScarcitySwitch from './SettingsScarcitySwitch';
import SettingsTeams from './SettingsTeams';
import SettingsDraftPosition from './SettingsDraftPosition';
import SettingsRoster from './SettingsRoster';
import SettingsReset from './SettingsReset';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SettingsModal = (props: SettingsModalProps) => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={4}>
            <SettingsFormat />
            <SettingsHidePlayersSwitch />
            <SettingsScarcitySwitch />
            <SettingsTeams />
            <SettingsDraftPosition />
            <SettingsRoster />
            <Divider />
            <SettingsReset />
          </Flex>
        </ModalBody>

        <ModalFooter>
          <Button onClick={props.onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
