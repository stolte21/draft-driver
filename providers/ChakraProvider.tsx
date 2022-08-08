import { PropsWithChildren } from 'react';
import { ChakraProvider as ChakraUIProvider } from '@chakra-ui/react';
import theme from 'styles/theme';

const ChakraProvider = (props: PropsWithChildren<{}>) => (
  <ChakraUIProvider theme={theme} {...props} />
);

export default ChakraProvider;
