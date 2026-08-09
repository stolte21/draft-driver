import { useQuery } from '@tanstack/react-query';
import { Player, PlayerDetails } from 'types';

export const NOT_FOUND_ERROR = 'not-found';

function usePlayerDetails(player: Player | null) {
  return useQuery<PlayerDetails>({
    queryKey: [
      'player-details',
      player?.name,
      player?.position,
      player?.team,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        name: player!.name,
        position: player!.position,
      });
      if (player!.team) params.set('team', player!.team);

      const response = await fetch(`/api/player-details?${params}`);

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? NOT_FOUND_ERROR
            : 'There was an error fetching player details'
        );
      }

      return response.json();
    },
    enabled: player !== null,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

export default usePlayerDetails;
