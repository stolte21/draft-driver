import { ColorModeScript } from '@chakra-ui/react';
import { Html, Head, Main, NextScript } from 'next/document';

const Document = () => (
  <Html>
    <Head />
    <body>
      <ColorModeScript initialColorMode="dark" />
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
