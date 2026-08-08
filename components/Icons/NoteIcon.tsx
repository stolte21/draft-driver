import { createIcon } from '@chakra-ui/react';

const NoteIcon = createIcon({
  displayName: 'NoteIcon',
  viewBox: '0 0 24 24',
  defaultProps: {
    fill: 'currentcolor',
  },
  path: (
    <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v9h-5a2 2 0 0 0-2 2v5H4a1 1 0 0 1-1-1V4zm13 15.586V16a1 1 0 0 1 1-1h4.586L16 19.586z" />
  ),
});

export default NoteIcon;
