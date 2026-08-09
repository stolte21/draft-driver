import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { useSettings } from 'providers/SettingsProvider';
import { useDraft } from 'providers/DraftProvider';

const SettingsReset = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { dispatch: dispatchSettings } = useSettings();
  const { dispatch: dispatchDraft } = useDraft();

  const handleReset = () => {
    dispatchDraft({ type: 'reset-all' });
    dispatchSettings({ type: 'reset' });
    onClose();
  };

  return (
    <>
      <Button colorScheme="red" variant="outline" width="100%" onClick={onOpen}>
        Delete Browser Data
      </Button>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Browser Data
            </AlertDialogHeader>

            <AlertDialogBody>
              This resets the app to a brand new slate. Your drafted players,
              roster, favorites, notes, keepers, and settings will be cleared.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleReset} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default SettingsReset;
