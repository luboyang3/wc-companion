import type { UserProfile } from "../types/user";

const fieldWeights = {
  nationality: 20,
  favoriteNationalTeams: 20,
  dateOfBirth: 15,
  yearsAsFan: 15,
  favoriteClubTeams: 15,
  gender: 15
} as const;

type ScoredField = keyof typeof fieldWeights;

const scoredFieldOrder: ScoredField[] = [
  "nationality",
  "favoriteNationalTeams",
  "dateOfBirth",
  "yearsAsFan",
  "favoriteClubTeams",
  "gender"
];

function isComplete(profile: UserProfile | null, field: ScoredField): boolean {
  if (!profile) {
    return false;
  }

  const value = profile[field];
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return value >= 0;
  }

  return Boolean(value);
}

export function calculatePersonalizationScore(profile: UserProfile | null): number {
  return scoredFieldOrder.reduce((score, field) => {
    if (isComplete(profile, field)) {
      return score + fieldWeights[field];
    }
    return score;
  }, 0);
}

export function getNextIncompleteField(profile: UserProfile | null): ScoredField | null {
  for (const field of scoredFieldOrder) {
    if (!isComplete(profile, field)) {
      return field;
    }
  }
  return null;
}

export const profileCardOrder: ScoredField[] = scoredFieldOrder;
export type { ScoredField };
