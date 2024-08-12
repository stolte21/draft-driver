import { useRef } from 'react';
import {
  Flex,
  Button,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import PlayerFilter from 'components/PlayerFilter';
import { useDraft } from 'providers/DraftProvider';

const Toolbar = () => {
  const { state, dispatch, getters } = useDraft();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleReset = () => {
    dispatch({ type: 'reset' });
    onClose();
  };

  return (
    <>
      <Flex flexDirection={'row'} gap={[1, 2]} marginBottom={2}>
        <Flex flexGrow={1} gap={[1, 2]}>
          <PlayerFilter
            filter={state.filter}
            onChange={(f) => dispatch({ type: 'update-filter', payload: f })}
          />
        </Flex>
        <Flex gap={[1, 2]} justifyContent="flex-end">
          <Button
            size={['sm', 'md']}
            isDisabled={
              getters.isInitializing || state.draftedPlayers.length === 0
            }
            onClick={() => dispatch({ type: 'undo' })}
          >
            Undo
          </Button>
          <Button
            size={['sm', 'md']}
            isDisabled={
              getters.isInitializing || state.draftedPlayers.length === 0
            }
            onClick={onOpen}
            colorScheme="red"
          >
            Reset
          </Button>
        </Flex>
      </Flex>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Reset Draft
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to reset the draft? You can&apos;t undo this
              action afterwards.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleReset} ml={3}>
                Reset
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default Toolbar;
