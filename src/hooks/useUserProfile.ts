import { useCallback, useEffect } from "react";
import { getUserProfile, isApiConfigured, updateUserProfile } from "../services/api";
import { isMockAuthEnabled } from "../services/env";
import { useProfileStore } from "../store/profileStore";
import type { UserProfileUpdate } from "../types/user";
import { useAuth } from "./useAuth";

interface UseUserProfileResult {
  isLoading: boolean;
  isInitialized: boolean;
  profileScore: number;
  nextIncompleteField: ReturnType<typeof useProfileStore.getState>["nextIncompleteField"];
  refreshProfile: () => Promise<void>;
  updateProfile: (fields: UserProfileUpdate) => Promise<void>;
}

export function useUserProfile(): UseUserProfileResult {
  const { isAuthenticated, user } = useAuth();
  const {
    isLoading,
    isInitialized,
    personalizationScore,
    nextIncompleteField,
    setLoading,
    setProfile
  } = useProfileStore();

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    const shouldUseLocalFallback = isMockAuthEnabled() || !isApiConfigured();
    if (shouldUseLocalFallback) {
      setProfile({
        userId: user?.id ?? "local-user",
        language: "en",
        isPaidUser: false,
        dailyAIQueryCount: 0
      });
      return;
    }

    setLoading(true);
    try {
      const profile = await getUserProfile();
      setProfile(profile);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setLoading, setProfile]);

  const updateProfile = useCallback(
    async (fields: UserProfileUpdate) => {
      const shouldUseLocalFallback = isMockAuthEnabled() || !isApiConfigured();
      if (shouldUseLocalFallback) {
        useProfileStore.getState().mergeProfileFields(fields);
        return;
      }

      setLoading(true);
      try {
        const updatedProfile = await updateUserProfile(fields);
        setProfile(updatedProfile);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setProfile]
  );

  useEffect(() => {
    if (!isInitialized && isAuthenticated) {
      void refreshProfile();
    }
  }, [isAuthenticated, isInitialized, refreshProfile]);

  return {
    isLoading,
    isInitialized,
    profileScore: personalizationScore,
    nextIncompleteField,
    refreshProfile,
    updateProfile
  };
}
