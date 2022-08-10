import { ReactNode } from 'react';
import Head from 'next/head';
import { Flex, BoxProps } from '@chakra-ui/react';

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
    <Flex
      flexDirection="column"
      height="calc(100% - 3.5rem)"
      width="100%"
      maxWidth="container.xl"
      paddingTop={2}
      paddingX={[1, 2]}
      marginX="auto"
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
    </Flex>
  );
};

export default Page;
