function getEnv(name: string): string | undefined {
  const maybeProcess = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return maybeProcess.process?.env?.[name];
}

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isMockAuthEnabled(): boolean {
  return parseBooleanEnv(getEnv("EXPO_PUBLIC_USE_MOCK_AUTH"));
}

export function getApiBaseUrl(): string | undefined {
  return getEnv("EXPO_PUBLIC_API_GATEWAY_URL");
}

export function getAwsRegion(): string | undefined {
  return getEnv("EXPO_PUBLIC_AWS_REGION");
}

export function getCognitoUserPoolId(): string | undefined {
  return getEnv("EXPO_PUBLIC_COGNITO_USER_POOL_ID");
}

export function getCognitoClientId(): string | undefined {
  return getEnv("EXPO_PUBLIC_COGNITO_CLIENT_ID");
}
