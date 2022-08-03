// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import playersJSON from 'public/players.json';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    //@ts-expect-error
    const players = [];

    Object.keys(playersJSON).forEach((id) => {
        //@ts-expect-error
        const player = playersJSON[id];

        if (
            player.status === 'Active' &&
            player.depth_chart_order <= 3 &&
            POSITIONS.includes(player.position)
        ) {
            players.push(player);
        }
    });

    //@ts-expect-error
    res.status(200).json(players);
}
