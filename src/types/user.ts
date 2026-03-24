export interface AuthUser {
  id: string;
  email?: string;
}

export type AppLanguage = "en" | "es" | "zh-Hans";
export type ProfileGender = "male" | "female" | "other" | "prefer_not_to_say";

export interface UserProfile {
  userId: string;
  dateOfBirth?: string;
  gender?: ProfileGender;
  nationality?: string;
  yearsAsFan?: number;
  favoriteNationalTeams?: string[];
  favoriteClubTeams?: string[];
  language?: AppLanguage;
  isPaidUser?: boolean;
  dailyAIQueryCount?: number;
  lastQueryReset?: string;
}

export type UserProfileUpdate = Partial<Omit<UserProfile, "userId">>;
