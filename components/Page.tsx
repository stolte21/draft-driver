import { ReactNode } from 'react';
import Head from 'next/head';
import { Box, BoxProps } from '@chakra-ui/react';

type Meta = {
  title: string;
  description: string;
};

type PageProps = {
  width?: BoxProps['width'];
  boxProps?: Omit<BoxProps, 'width'>;
  meta?: Partial<Meta>;
  children: ReactNode;
};

const Page = (props: PageProps) => {
  const {
    width = '100%',
    boxProps = {},
    meta = {
      title: 'Draft Driver | Fantasy Football Draft Tool',
      description: 'Drafting tool for fantasy football players.',
    },
    children,
  } = props;
  return (
    <Box
      width={width}
      maxWidth="container.xl"
      marginTop={2}
      paddingX={[1, 2]}
      marginX="auto"
      {...boxProps}
    >
      <Head>
        <title>{meta.title}</title>
        <meta content={meta.description} name="description" />
      </Head>
      {children}
    </Box>
  );
};

export default Page;
