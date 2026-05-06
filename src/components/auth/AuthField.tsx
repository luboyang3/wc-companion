import { useState } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors, radii } from "../../theme/tokens";

interface AuthFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
}

export function AuthField({ label, hint, onFocus, onBlur, ...inputProps }: AuthFieldProps): JSX.Element {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        placeholderTextColor={colors.ink3}
        style={[styles.input, focused ? styles.inputFocused : null]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12
  },
  label: {
    color: colors.ink3,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputFocused: {
    borderColor: colors.accent
  },
  hint: {
    color: colors.ink3,
    fontSize: 10,
    marginTop: 4
  }
});
