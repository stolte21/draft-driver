import type { AppProps } from 'next/app';
import ChakraProvider from 'providers/ChakraProvider';
import SettingsProvider from 'providers/SettingsProvider';
import DraftProvider from 'providers/DraftProvider';
import AppBar from 'components/AppBar';

const App = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <SettingsProvider>
      <AppBar />
      <DraftProvider>
        <Component {...pageProps} />
      </DraftProvider>
    </SettingsProvider>
  </ChakraProvider>
);

export default App;
