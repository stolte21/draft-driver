import { ReactNode } from 'react';
import Head from 'next/head';
import { Box, BoxProps } from '@chakra-ui/react';

type Meta = {
  title: string;
  description: string;
};

type PageProps = {
  boxProps?: Omit<BoxProps, 'width'>;
  meta?: Partial<Meta>;
  children: ReactNode;
};

const Page = (props: PageProps) => {
  const {
    boxProps = {},
    meta = {
      title: 'Draft Driver | Fantasy Football Draft Tool',
      description: 'Drafting tool for fantasy football players.',
    },
    children,
  } = props;
  return (
    <Box
      display="grid"
      gridTemplateRows="auto 1fr auto"
      gridTemplateColumns="1fr min(var(--chakra-sizes-container-xl), calc(100% - 20px)) 1fr"
      gridColumnGap="10px"
      height="100%"
      width="100%"
      {...boxProps}
    >
      <Head>
        <title>{meta.title}</title>
        <meta content={meta.description} name="description" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      {children}
    </Box>
  );
};

export default Page;
