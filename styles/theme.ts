import { extendTheme, Theme } from '@chakra-ui/react';

const themeObject: Partial<Theme> = {
  styles: {
    global: {
      'html, body, #__next': {
        height: '100%',
      },
      body: {
        minWidth: '320px',
      },
      '::-webkit-scrollbar': {
        width: '4px',
        height: '4px',
      },
      '::-webkit-scrollbar-track': {
        backgroundColor: 'gray.900',
      },

      '::-webkit-scrollbar-thumb': {
        backgroundColor: 'gray.500',
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: 'gray.500 gray.900',
      },
    },
  },
  config: {
    initialColorMode: 'dark',
  },
};

const theme = extendTheme(themeObject);

export default theme;
