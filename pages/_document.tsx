import { ColorModeScript } from '@chakra-ui/react';
import { Html, Head, Main, NextScript } from 'next/document';

const Document = () => (
  <Html lang="en">
    <Head>
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <meta name="theme-color" content="#1a1a1a" />
    </Head>
    <body>
      <ColorModeScript initialColorMode="dark" />
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
