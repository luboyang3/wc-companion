import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  confirmSignUp as amplifyConfirmSignUp,
  getCurrentUser,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp
} from "@aws-amplify/auth";
import type { AuthUser } from "../types/user";

interface ConfirmOTPArgs {
  email: string;
  otp: string;
}

interface SignUpArgs {
  email: string;
  password: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (args: SignUpArgs) => Promise<void>;
  confirmOTP: (args: ConfirmOTPArgs) => Promise<void>;
}

function mapAmplifyUser(user: Awaited<ReturnType<typeof getCurrentUser>>): AuthUser {
  return {
    id: user.userId,
    email: user.signInDetails?.loginId
  };
}

function useAuthState(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(mapAmplifyUser(currentUser));
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    await amplifySignIn({ username: email, password });
    await refreshCurrentUser();
  }, [refreshCurrentUser]);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  const signUp = useCallback(async ({ email, password }: SignUpArgs) => {
    await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email
        }
      }
    });
  }, []);

  const confirmOTP = useCallback(async ({ email, otp }: ConfirmOTPArgs) => {
    await amplifyConfirmSignUp({
      username: email,
      confirmationCode: otp
    });
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    signUp,
    confirmOTP
  };
}

const AuthContext = createContext<UseAuthResult | null>(null);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthResult {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export type { ConfirmOTPArgs, SignUpArgs, UseAuthResult };
