export type PickInfo = { round: number; pickInRound: number };

/** Converts a 1-based overall pick number into round / pick-in-round. */
export function getPickInfo(overall: number, numTeams: number): PickInfo {
  return {
    round: Math.floor((overall - 1) / numTeams) + 1,
    pickInRound: ((overall - 1) % numTeams) + 1,
  };
}

/**
 * Snake order: the user's slot is draftPosition in odd rounds and
 * numTeams - draftPosition + 1 in even rounds. A draftPosition that is
 * unset or outside 1..numTeams (e.g. the league was shrunk after it was
 * set) turns the feature off rather than erroring.
 */
export function isUsersPick(
  overall: number,
  numTeams: number,
  draftPosition: number | null
): boolean {
  if (
    draftPosition == null ||
    !Number.isInteger(draftPosition) ||
    draftPosition < 1 ||
    draftPosition > numTeams
  ) {
    return false;
  }

  const { round, pickInRound } = getPickInfo(overall, numTeams);
  const usersSlot =
    round % 2 === 1 ? draftPosition : numTeams - draftPosition + 1;

  return pickInRound === usersSlot;
}
