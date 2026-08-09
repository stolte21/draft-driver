import type { NextApiRequest, NextApiResponse } from 'next';
import { getDepthCharts } from 'utils/depthCharts';
import { DepthChart } from 'types';

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<DepthChart[] | { error: string }>
) {
  try {
    const teams = await getDepthCharts();

    res.status(200).json(teams);
  } catch (error) {
    console.error('Failed to load depth charts', error);
    res.status(502).json({ error: 'Failed to load depth charts' });
  }
}
