import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Textarea,
} from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';
import { Player } from 'types';

type PlayerNoteModalProps = {
  player: Player | null;
  onClose: () => void;
};

const PlayerNoteModal = (props: PlayerNoteModalProps) => {
  const { state, dispatch } = useDraft();
  const [note, setNote] = useState('');

  // re-seed the textarea whenever the modal opens for a player
  useEffect(() => {
    if (props.player) {
      setNote(state.notes[props.player.id] ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.player]);

  const handleSave = () => {
    if (props.player) {
      dispatch({
        type: 'set-note',
        payload: { id: props.player.id, note },
      });
    }
    props.onClose();
  };

  return (
    <Modal
      isOpen={props.player !== null}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Note: {props.player?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type a note about this player…"
            rows={5}
            autoFocus
          />
        </ModalBody>

        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PlayerNoteModal;
