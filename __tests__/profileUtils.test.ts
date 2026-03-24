import { calculatePersonalizationScore, getNextIncompleteField } from "../src/utils/profile";
import type { UserProfile } from "../src/types/user";

describe("profile utils", () => {
  it("calculates expected score for partially complete profiles", () => {
    const profile: UserProfile = {
      userId: "u1",
      nationality: "US",
      favoriteNationalTeams: ["USA"],
      yearsAsFan: 12
    };

    expect(calculatePersonalizationScore(profile)).toBe(55);
  });

  it("returns first incomplete field in onboarding order", () => {
    const profile: UserProfile = {
      userId: "u1",
      nationality: "US",
      favoriteNationalTeams: ["USA"]
    };

    expect(getNextIncompleteField(profile)).toBe("dateOfBirth");
  });

  it("returns null when all scored fields are complete", () => {
    const profile: UserProfile = {
      userId: "u1",
      nationality: "US",
      favoriteNationalTeams: ["USA"],
      dateOfBirth: "1990-05-10",
      yearsAsFan: 20,
      favoriteClubTeams: ["MCI"],
      gender: "female"
    };

    expect(calculatePersonalizationScore(profile)).toBe(100);
    expect(getNextIncompleteField(profile)).toBeNull();
  });
});
