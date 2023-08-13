import { extendTheme, Theme, StyleFunctionProps } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: (props: StyleFunctionProps) => ({
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
        backgroundColor:
          props.colorMode === 'dark' ? 'blackAlpha.300' : 'blackAlpha.200',
      },
      '::-webkit-scrollbar-thumb': {
        backgroundColor:
          props.colorMode === 'dark' ? 'blackAlpha.700' : 'blackAlpha.600',
      },
      '*': {
        scrollbarColor:
          props.colorMode === 'dark'
            ? 'var(--chakra-colors-blackAlpha-700) var(--chakra-colors-blackAlpha-300)'
            : 'var(--chakra-colors-blackAlpha-600) var(--chakra-colors-blackAlpha-200)',
      },
    }),
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
  config: {
    initialColorMode: 'dark',
  },
});

export default theme;
