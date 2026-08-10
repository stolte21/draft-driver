export type InjuryIndicator = {
  label: string;
  severe: boolean;
};

// Sleeper statuses seen in the wild: Questionable, Doubtful, Out, IR, PUP,
// Sus, NFI, COV, DNR. Questionable is common (especially camp tags in
// August) so it renders non-severe; everything else means the player is
// realistically unavailable and renders severe.
const INDICATORS: Record<string, InjuryIndicator> = {
  questionable: { label: 'Q', severe: false },
  doubtful: { label: 'D', severe: true },
  out: { label: 'O', severe: true },
};

export function getInjuryIndicator(
  status: string | undefined
): InjuryIndicator | null {
  const trimmed = status?.trim();
  if (!trimmed) return null;

  return (
    INDICATORS[trimmed.toLowerCase()] ?? {
      label: trimmed.toUpperCase(),
      severe: true,
    }
  );
}

export function formatInjuryDetail(
  status: string,
  bodyPart: string | undefined
) {
  return bodyPart ? `${status} — ${bodyPart}` : status;
}
