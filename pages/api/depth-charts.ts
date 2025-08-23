import type { NextApiRequest, NextApiResponse } from 'next';
import { parseDepthCharts } from 'utils/scrape';

type DepthChartResponse = Awaited<ReturnType<typeof parseDepthCharts>>;

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<DepthChartResponse>
) {
  try {
    const teams = await parseDepthCharts();

    res.status(200).json(teams);
  } catch (error) {
    //@ts-ignore
    throw new Error(error);
  }
}
