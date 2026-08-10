import { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, BoxProps } from '@chakra-ui/react';
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  OG_IMAGE_URL,
  canonicalUrl,
} from 'utils/site';

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

  const { boxProps = {}, meta: metaProp = {}, children } = props;

  const meta: Meta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    ...metaProp,
  };

  const canonical = canonicalUrl(router.pathname);

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
          content="width=device-width, initial-scale=1"
        />
        <link rel="canonical" href={canonical} key="canonical" />
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
        <meta property="og:title" content={meta.title} key="og:title" />
        <meta
          property="og:description"
          content={meta.description}
          key="og:description"
        />
        <meta property="og:url" content={canonical} key="og:url" />
        <meta property="og:image" content={OG_IMAGE_URL} key="og:image" />
        <meta
          name="twitter:card"
          content="summary_large_image"
          key="twitter:card"
        />
        <meta name="twitter:title" content={meta.title} key="twitter:title" />
        <meta
          name="twitter:description"
          content={meta.description}
          key="twitter:description"
        />
        <meta name="twitter:image" content={OG_IMAGE_URL} key="twitter:image" />
      </Head>
      {children}
    </Box>
  );
};

export default Page;
