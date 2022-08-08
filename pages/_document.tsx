import { ColorModeScript } from '@chakra-ui/react';
import { Html, Head, Main, NextScript } from 'next/document';
import theme from 'styles/theme';

const Document = () => (
  <Html>
    <Head />
    <body>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
