import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { Player } from 'types';

export type DepthChartTableProps = {
  position: string;
  players: Player[];
};

function playerIsValue(player: Player) {
  return (
    player.rank !== undefined &&
    player.adp !== undefined &&
    player.rank > 0 &&
    player.adp > 0 &&
    player.rank < player.adp
  );
}

export function DepthChartTable(props: DepthChartTableProps) {
  return (
    <TableContainer
      height="100%"
      border="1px"
      borderColor="gray.600"
      borderRadius="md"
      padding={2}
    >
      <Table size="sm" variant={'unstyled'}>
        <Thead>
          <Tr>
            <Th>{props.position}</Th>
            <Th isNumeric>Ranking</Th>
            <Th isNumeric>ADP</Th>
          </Tr>
        </Thead>
        <Tbody>
          {props.players.map((player) => (
            <Tr
              key={player.id}
              bg={playerIsValue(player) ? 'blue.900' : undefined}
            >
              <Td>{player.name}</Td>
              <Td isNumeric>{player.rank ?? '—'}</Td>
              <Td isNumeric>{player.adp ?? '—'}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

export default DepthChartTable;
