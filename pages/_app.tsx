import type { AppProps } from 'next/app';
import ChakraProvider from 'providers/ChakraProvider';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ChakraProvider>
            <Component {...pageProps} />
        </ChakraProvider>
    );
}

export default MyApp;
