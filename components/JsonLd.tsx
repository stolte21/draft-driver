import Head from 'next/head';

type JsonLdProps = {
  schema: Record<string, unknown>;
};

const JsonLd = ({ schema }: JsonLdProps) => (
  <Head>
    <script
      type="application/ld+json"
      // JSON.stringify of a plain object built in our own code — safe to inline
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  </Head>
);

export default JsonLd;
