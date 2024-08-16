import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChakraProvider from 'providers/ChakraProvider';
import SettingsProvider from 'providers/SettingsProvider';

const queryClient = new QueryClient();

const App = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </QueryClientProvider>
  </ChakraProvider>
);

export default App;
