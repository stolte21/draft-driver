import { extendTheme, Theme } from '@chakra-ui/react';

const themeObject: Partial<Theme> = {
  styles: {
    global: (props) => ({
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
  config: {
    initialColorMode: 'dark',
  },
};

const theme = extendTheme(themeObject);

export default theme;
