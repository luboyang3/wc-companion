import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { AuthProvider, useAuth } from "../src/hooks/useAuth";

const mockGetCurrentUser = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockSignUp = jest.fn();
const mockConfirmSignUp = jest.fn();

jest.mock("@aws-amplify/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  signIn: (args: unknown) => mockSignIn(args),
  signOut: () => mockSignOut(),
  signUp: (args: unknown) => mockSignUp(args),
  confirmSignUp: (args: unknown) => mockConfirmSignUp(args)
}));

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes unauthenticated state when no current user", async () => {
    mockGetCurrentUser.mockRejectedValueOnce(new Error("not signed in"));

    const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it("calls amplify signIn and refreshes user", async () => {
    mockGetCurrentUser
      .mockRejectedValueOnce(new Error("not signed in"))
      .mockResolvedValueOnce({
        userId: "user-1",
        signInDetails: { loginId: "fan@example.com" }
      });

    const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn("fan@example.com", "Password123!");
    });

    expect(mockSignIn).toHaveBeenCalledWith({
      username: "fan@example.com",
      password: "Password123!"
    });
    await waitFor(() => {
      expect(result.current.user?.email).toBe("fan@example.com");
    });
  });
});
