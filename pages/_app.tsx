import type { AppProps } from 'next/app';
import ChakraProvider from 'providers/ChakraProvider';
import RosterSettingsProvider from 'providers/RosterSettingsProvider';
import DraftProvider from 'providers/DraftProvider';
import AppBar from 'components/AppBar';

const App = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <RosterSettingsProvider>
      <AppBar />
      <DraftProvider>
        <Component {...pageProps} />
      </DraftProvider>
    </RosterSettingsProvider>
  </ChakraProvider>
);

export default App;
