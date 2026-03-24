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

export function isMockAIChatEnabled(): boolean {
  return parseBooleanEnv(getEnv("EXPO_PUBLIC_USE_MOCK_AI_CHAT"));
}

export function getApiBaseUrl(): string | undefined {
  return getEnv("EXPO_PUBLIC_API_GATEWAY_URL");
}

export function getFreeQueryLimit(): number {
  const raw = getEnv("EXPO_PUBLIC_FREE_QUERY_LIMIT");
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 20;
  }
  return parsed;
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
