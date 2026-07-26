import { Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';
import { useSettings } from 'providers/SettingsProvider';
import { areRankingsStale, getRankingsName } from 'utils';

const StaleRankingsBanner = () => {
  const { getters } = useDraft();
  const {
    state: { dataSource },
  } = useSettings();
  const lastModified = getters.rankingsLastModified;

  if (dataSource !== 'boris') return null;
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
        {getRankingsName(dataSource)} rankings were last updated {formatted} and
        may be from a previous season.
      </AlertDescription>
    </Alert>
  );
};

export default StaleRankingsBanner;
