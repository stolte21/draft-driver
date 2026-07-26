import { useQuery } from '@tanstack/react-query';
import { DataSource, Format, Player } from 'types';

type UseRankingsOptions = {
  isEnabled: boolean;
  format: Format;
  dataSource: DataSource;
};

type RankingsResult = {
  players: Player[];
  lastModified?: string;
};

function useRankings(options: UseRankingsOptions) {
  return useQuery<RankingsResult>({
    queryKey: ['rankings', options.format, options.dataSource],
    queryFn: async () => {
      const response = await fetch(
        `/api/rankings?format=${options.format}&src=${options.dataSource}`
      );

      if (!response.ok) {
        throw new Error('There was an error fetching fantasy rankings');
      }

      const players: Player[] = await response.json();
      return {
        players,
        lastModified: response.headers.get('x-rankings-last-modified') ?? undefined,
      };
    },
    enabled: options.isEnabled,
    staleTime: Infinity,
  });
}

export default useRankings;
