import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      'html, body, #__next': {
        height: '100%',
        overflow: 'hidden',
      },
      body: {
        minWidth: '320px',
        minHeight: '600px',
      },
      '::-webkit-scrollbar': {
        width: '4px',
        height: '4px',
      },
      '::-webkit-scrollbar-track': {
        backgroundColor: 'blackAlpha.300',
      },
      '::-webkit-scrollbar-thumb': {
        backgroundColor: 'blackAlpha.700',
      },
      '*': {
        scrollbarColor: 'var(--chakra-colors-blackAlpha-700) var(--chakra-colors-blackAlpha-300)',
      },
    },
  },
  colors: {
    gray: {
      50: '#f5f5f5',
      100: '#eeeeee',
      200: '#e0e0e0',
      300: '#bdbdbd',
      400: '#9e9e9e',
      500: '#757575',
      600: '#616161',
      700: '#424242',
      800: '#212121',
      900: '#1a1a1a',
    },
  },
});

export default theme;
