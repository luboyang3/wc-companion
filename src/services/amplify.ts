import { Amplify } from "aws-amplify";

const region = process.env.EXPO_PUBLIC_AWS_REGION;
const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;

export function configureAmplify(): void {
  if (!region || !userPoolId || !userPoolClientId) {
    // Keep app booting for local UI work while env values are missing.
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
}
