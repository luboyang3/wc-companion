import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AuthForm } from "../src/components/auth/AuthForm";

describe("AuthForm", () => {
  it("submits email/password for login", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = render(<AuthForm mode="login" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId("auth-email-input"), "fan@example.com");
    fireEvent.changeText(screen.getByTestId("auth-password-input"), "Password123!");
    fireEvent.press(screen.getByTestId("auth-submit-button"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "fan@example.com",
        password: "Password123!"
      });
    });
  });

  it("blocks register when passwords mismatch", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = render(<AuthForm mode="register" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId("auth-email-input"), "fan@example.com");
    fireEvent.changeText(screen.getByTestId("auth-password-input"), "Password123!");
    fireEvent.changeText(screen.getByTestId("auth-confirm-password-input"), "PasswordABC!");
    fireEvent.press(screen.getByTestId("auth-submit-button"));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    });
  });
});
