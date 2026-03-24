import { Amplify } from "aws-amplify";
import { getAwsRegion, getCognitoClientId, getCognitoUserPoolId, isMockAuthEnabled } from "./env";

const region = getAwsRegion();
const userPoolId = getCognitoUserPoolId();
const userPoolClientId = getCognitoClientId();
let authConfigured = false;

export function configureAmplify(): void {
  if (isMockAuthEnabled()) {
    Amplify.configure({});
    authConfigured = false;
    return;
  }

  if (!region || !userPoolId || !userPoolClientId) {
    // Mark Amplify as configured to avoid noisy runtime warnings in local UI-only sessions.
    Amplify.configure({});
    authConfigured = false;
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true
        }
      }
    }
  });
  authConfigured = true;
}

export function isAmplifyAuthConfigured(): boolean {
  return authConfigured;
}
