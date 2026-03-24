import { create } from "zustand";
import type { UserProfile, UserProfileUpdate } from "../types/user";
import { calculatePersonalizationScore, getNextIncompleteField, type ScoredField } from "../utils/profile";

interface ProfileStoreState {
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  personalizationScore: number;
  nextIncompleteField: ScoredField | null;
  setProfile: (profile: UserProfile) => void;
  setLoading: (isLoading: boolean) => void;
  mergeProfileFields: (fields: UserProfileUpdate) => void;
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  profile: null,
  isLoading: false,
  isInitialized: false,
  personalizationScore: 0,
  nextIncompleteField: "nationality",
  setProfile: (profile) =>
    set({
      profile,
      isInitialized: true,
      isLoading: false,
      personalizationScore: calculatePersonalizationScore(profile),
      nextIncompleteField: getNextIncompleteField(profile)
    }),
  setLoading: (isLoading) => set({ isLoading }),
  mergeProfileFields: (fields) =>
    set((state) => {
      const currentProfile: UserProfile = state.profile ?? { userId: "" };
      const mergedProfile: UserProfile = { ...currentProfile, ...fields };
      return {
        profile: mergedProfile,
        isInitialized: true,
        personalizationScore: calculatePersonalizationScore(mergedProfile),
        nextIncompleteField: getNextIncompleteField(mergedProfile)
      };
    })
}));
