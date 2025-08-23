import { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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
  const router = useRouter();

  const {
    boxProps = {},
    meta = {
      title: 'Draft Driver | Fantasy Football Draft Tool',
      description: 'Drafting tool for fantasy football players.',
    },
    children,
  } = props;

  const homePageProps = {
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateColumns:
      '1fr min(var(--chakra-sizes-container-xl), calc(100% - 20px)) 1fr',
    gridColumnGap: '10px',
  };

  const isHomePage = router.pathname === '/';

  return (
    <Box
      height="100%"
      width="100%"
      {...boxProps}
      {...(isHomePage ? homePageProps : {})}
    >
      {isHomePage && (
        <style jsx global>{`
          html,
          body,
          #__next {
            height: 100%;
            overflow: hidden;
          }
        `}</style>
      )}
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
