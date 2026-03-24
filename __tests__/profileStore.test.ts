import { useProfileStore } from "../src/store/profileStore";

describe("profileStore", () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: null,
      isLoading: false,
      isInitialized: false,
      personalizationScore: 0,
      nextIncompleteField: "nationality"
    });
  });

  it("sets full profile and computes score", () => {
    useProfileStore.getState().setProfile({
      userId: "u1",
      nationality: "US",
      favoriteNationalTeams: ["USA"],
      dateOfBirth: "1990-05-10",
      yearsAsFan: 20,
      favoriteClubTeams: ["MCI"],
      gender: "female"
    });

    const state = useProfileStore.getState();
    expect(state.personalizationScore).toBe(100);
    expect(state.nextIncompleteField).toBeNull();
  });

  it("merges partial fields and updates next incomplete field", () => {
    useProfileStore.getState().setProfile({ userId: "u1" });
    useProfileStore.getState().mergeProfileFields({ nationality: "US" });

    const state = useProfileStore.getState();
    expect(state.profile?.nationality).toBe("US");
    expect(state.personalizationScore).toBe(20);
    expect(state.nextIncompleteField).toBe("favoriteNationalTeams");
  });
});
