import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChakraProvider from 'providers/ChakraProvider';
import SettingsProvider from 'providers/SettingsProvider';
import DraftProvider from 'providers/DraftProvider';
import DepthChartsProvider from 'providers/DepthChartsProvider';

const queryClient = new QueryClient();

const App = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <DraftProvider>
          <DepthChartsProvider>
            <Component {...pageProps} />
          </DepthChartsProvider>
        </DraftProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </ChakraProvider>
);

export default App;
