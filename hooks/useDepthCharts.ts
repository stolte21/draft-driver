import { useQuery } from '@tanstack/react-query';

function useDepthCharts() {
  return useQuery({
    queryKey: ['depth-charts'],
    queryFn: async () => {
      const response = await fetch(`/api/depth-charts`);

      if (!response.ok) {
        throw new Error('There was an error fetching fantasy rankings');
      }

      return response.json();
    },

    staleTime: Infinity,
  });
}

export default useDepthCharts;
