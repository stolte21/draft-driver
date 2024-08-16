import { useQuery } from '@tanstack/react-query';
import { DataSource, Format } from 'types';

type UseRankingsOptions = {
  isEnabled: boolean;
  format: Format;
  dataSource: DataSource;
};

function useRankings(options: UseRankingsOptions) {
  return useQuery({
    queryKey: ['rankings', options.format, options.dataSource],
    queryFn: async () => {
      const response = await fetch(
        `/api/rankings?format=${options.format}&src=${options.dataSource}`
      );

      if (!response.ok) {
        throw new Error('There was an error fetching fantasy rankings');
      }

      return response.json();
    },
    enabled: options.isEnabled,
    staleTime: Infinity,
  });
}

export default useRankings;
