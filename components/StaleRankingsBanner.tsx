import { Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';
import { areRankingsStale } from 'utils';

const StaleRankingsBanner = () => {
  const { getters } = useDraft();
  const lastModified = getters.rankingsLastModified;

  if (!areRankingsStale(lastModified, new Date())) return null;

  const formatted = new Date(lastModified!).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Alert status="warning" rounded="md" marginBottom={2} paddingY={1}>
      <AlertIcon />
      <AlertDescription fontSize="sm">
        Boris Chen rankings were last updated {formatted} and may be from a
        previous season.
      </AlertDescription>
    </Alert>
  );
};

export default StaleRankingsBanner;
