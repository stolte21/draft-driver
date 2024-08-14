import type { AppProps } from 'next/app';
import ChakraProvider from 'providers/ChakraProvider';
import SettingsProvider from 'providers/SettingsProvider';

const App = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <SettingsProvider>
      <Component {...pageProps} />
    </SettingsProvider>
  </ChakraProvider>
);

export default App;
