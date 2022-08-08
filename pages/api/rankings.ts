import type { NextApiRequest, NextApiResponse } from "next";
import playersJSON from "public/players.json";
import { formatsList, positionsList } from "utils";
import { Format, Player } from "types";

function validateFormat(query: NextApiRequest["query"]): Format {
  const { format } = query;

  if (!format) return "ppr";

  const parsedFormat = format.toString();

  //@ts-ignore
  if (formatsList.includes(parsedFormat)) {
    return parsedFormat as Format;
  } else {
    return "ppr";
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Player[]>
) {
  const format = validateFormat(req.query);
  console.log("getting rankings for format: ", format);

  const players: Player[] = [];

  Object.keys(playersJSON).forEach((id) => {
    //@ts-expect-error
    const player = playersJSON[id];

    if (
      player.status === "Active" &&
      player.depth_chart_order <= 3 &&
      positionsList.includes(player.position)
    ) {
      players.push({
        id: player.fantasy_data_id,
        name: player.full_name,
        position: player.position,
        team: player.team,
      });
    }
  });

  res.status(200).json(players);
}
