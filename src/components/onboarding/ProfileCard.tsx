import { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii } from "../../theme/tokens";
import type { AppLanguage, ProfileGender, UserProfile, UserProfileUpdate } from "../../types/user";
import { profileCardOrder, type ScoredField } from "../../utils/profile";

const allSteps = [...profileCardOrder, "language"] as const;
type ProfileStep = (typeof allSteps)[number];

interface ProfileCardProps {
  profile: UserProfile | null;
  initialField?: ScoredField | null;
  onSaveField: (fields: UserProfileUpdate) => Promise<void>;
  isSaving?: boolean;
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProfileCard({
  profile,
  initialField,
  onSaveField,
  isSaving = false
}: ProfileCardProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? "");
  const [nationality, setNationality] = useState(profile?.nationality ?? "");
  const [yearsAsFan, setYearsAsFan] = useState(
    profile?.yearsAsFan !== undefined ? String(profile.yearsAsFan) : ""
  );
  const [favoriteNationalTeams, setFavoriteNationalTeams] = useState(
    (profile?.favoriteNationalTeams ?? []).join(", ")
  );
  const [favoriteClubTeams, setFavoriteClubTeams] = useState((profile?.favoriteClubTeams ?? []).join(", "));
  const [gender, setGender] = useState<ProfileGender | undefined>(profile?.gender);
  const [language, setLanguage] = useState<AppLanguage>(profile?.language ?? "en");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialField) {
      return;
    }

    const initialIndex = allSteps.findIndex((step) => step === initialField);
    if (initialIndex >= 0) {
      setCurrentIndex(initialIndex);
    }
  }, [initialField]);

  useEffect(() => {
    setDateOfBirth(profile?.dateOfBirth ?? "");
    setNationality(profile?.nationality ?? "");
    setYearsAsFan(profile?.yearsAsFan !== undefined ? String(profile.yearsAsFan) : "");
    setFavoriteNationalTeams((profile?.favoriteNationalTeams ?? []).join(", "));
    setFavoriteClubTeams((profile?.favoriteClubTeams ?? []).join(", "));
    setGender(profile?.gender);
    setLanguage(profile?.language ?? "en");
  }, [profile]);

  const currentStep = allSteps[currentIndex];

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case "nationality":
        return { title: "Where are you from?", hint: "Use a country code like US, ES, CN." };
      case "favoriteNationalTeams":
        return { title: "Favorite national teams", hint: "Comma-separated FIFA team IDs." };
      case "dateOfBirth":
        return { title: "Date of birth", hint: "Format: YYYY-MM-DD." };
      case "yearsAsFan":
        return { title: "How long have you followed football?", hint: "Enter years from 0 to 40." };
      case "favoriteClubTeams":
        return { title: "Favorite club teams", hint: "Comma-separated club IDs." };
      case "gender":
        return { title: "Gender", hint: "Optional but helps personalize answers." };
      case "language":
        return { title: "Preferred language", hint: "Used for app and AI responses." };
      default:
        return { title: "Profile", hint: "" };
    }
  }, [currentStep]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50 && currentIndex < allSteps.length - 1) {
            setCurrentIndex((index) => index + 1);
          } else if (gestureState.dx > 50 && currentIndex > 0) {
            setCurrentIndex((index) => index - 1);
          }
        }
      }),
    [currentIndex]
  );

  const handleSave = async () => {
    setErrorMessage(null);

    try {
      switch (currentStep) {
        case "dateOfBirth":
          if (!dateOfBirth) {
            throw new Error("Date of birth is required.");
          }
          await onSaveField({ dateOfBirth });
          break;
        case "nationality":
          if (!nationality) {
            throw new Error("Nationality is required.");
          }
          await onSaveField({ nationality: nationality.toUpperCase() });
          break;
        case "yearsAsFan": {
          const value = Number(yearsAsFan);
          if (Number.isNaN(value) || value < 0 || value > 40) {
            throw new Error("Years as fan must be between 0 and 40.");
          }
          await onSaveField({ yearsAsFan: value });
          break;
        }
        case "favoriteNationalTeams": {
          const teams = parseCsv(favoriteNationalTeams);
          if (teams.length === 0) {
            throw new Error("Add at least one national team.");
          }
          await onSaveField({ favoriteNationalTeams: teams });
          break;
        }
        case "favoriteClubTeams": {
          const teams = parseCsv(favoriteClubTeams);
          if (teams.length === 0) {
            throw new Error("Add at least one club team.");
          }
          await onSaveField({ favoriteClubTeams: teams });
          break;
        }
        case "gender":
          if (!gender) {
            throw new Error("Please select a gender option.");
          }
          await onSaveField({ gender });
          break;
        case "language":
          await onSaveField({ language });
          break;
      }

      if (currentIndex < allSteps.length - 1) {
        setCurrentIndex((index) => index + 1);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save field.");
    }
  };

  return (
    <View {...panResponder.panHandlers} style={styles.card}>
      <Text style={styles.stepCounter}>
        Step {currentIndex + 1} / {allSteps.length}
      </Text>
      <Text style={styles.title}>{stepMeta.title}</Text>
      <Text style={styles.hint}>{stepMeta.hint}</Text>

      {currentStep === "dateOfBirth" ? (
        <TextInput
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          value={dateOfBirth}
        />
      ) : null}

      {currentStep === "nationality" ? (
        <TextInput
          autoCapitalize="characters"
          onChangeText={setNationality}
          placeholder="US"
          style={styles.input}
          value={nationality}
        />
      ) : null}

      {currentStep === "yearsAsFan" ? (
        <TextInput
          keyboardType="number-pad"
          onChangeText={setYearsAsFan}
          placeholder="10"
          style={styles.input}
          value={yearsAsFan}
        />
      ) : null}

      {currentStep === "favoriteNationalTeams" ? (
        <TextInput
          onChangeText={setFavoriteNationalTeams}
          placeholder="BRA, ARG"
          style={styles.input}
          value={favoriteNationalTeams}
        />
      ) : null}

      {currentStep === "favoriteClubTeams" ? (
        <TextInput
          onChangeText={setFavoriteClubTeams}
          placeholder="FCB, MCI"
          style={styles.input}
          value={favoriteClubTeams}
        />
      ) : null}

      {currentStep === "gender" ? (
        <View style={styles.row}>
          {(["male", "female", "other", "prefer_not_to_say"] as ProfileGender[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setGender(option)}
              style={[styles.optionChip, gender === option ? styles.optionChipActive : null]}
            >
              <Text style={gender === option ? styles.optionLabelActive : styles.optionLabel}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {currentStep === "language" ? (
        <View style={styles.row}>
          {(["en", "es", "zh-Hans"] as AppLanguage[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setLanguage(option)}
              style={[styles.optionChip, language === option ? styles.optionChipActive : null]}
            >
              <Text style={language === option ? styles.optionLabelActive : styles.optionLabel}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          style={[styles.secondaryButton, currentIndex === 0 ? styles.disabled : null]}
        >
          <Text style={styles.secondaryLabel}>Previous</Text>
        </Pressable>
        <Pressable disabled={isSaving} onPress={() => void handleSave()} style={styles.primaryButton}>
          <Text style={styles.primaryLabel}>{isSaving ? "Saving..." : "Save & continue"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16
  },
  stepCounter: {
    color: colors.ink3,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8
  },
  hint: {
    color: colors.ink3,
    fontSize: 12,
    marginBottom: 12
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.lineSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  optionChip: {
    backgroundColor: "transparent",
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  optionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  optionLabel: {
    color: colors.ink,
    fontSize: 12
  },
  optionLabelActive: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "600"
  },
  errorText: {
    color: colors.live,
    fontSize: 12,
    marginTop: 12
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12
  },
  primaryLabel: {
    color: "#000000",
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  secondaryLabel: {
    color: colors.ink,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.5
  }
});
