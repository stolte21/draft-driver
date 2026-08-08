import { useQuery } from '@tanstack/react-query';
import { Format, Player } from 'types';

type UseRankingsOptions = {
  isEnabled: boolean;
  format: Format;
};

type RankingsResult = {
  players: Player[];
  lastModified?: string;
};

function useRankings(options: UseRankingsOptions) {
  return useQuery<RankingsResult>({
    queryKey: ['rankings', options.format],
    queryFn: async () => {
      const response = await fetch(`/api/rankings?format=${options.format}`);

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
