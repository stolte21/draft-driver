import Head from 'next/head';

type JsonLdProps = {
  schema: Record<string, unknown>;
};

const JsonLd = ({ schema }: JsonLdProps) => (
  <Head>
    <script
      type="application/ld+json"
      // Escape `<` so a `</script>` sequence in schema content (e.g. FAQ
      // text) can never break out of the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  </Head>
);

export default JsonLd;
