import { Redirect } from "expo-router";
import { useAuth } from "../hooks/useAuth";

export default function IndexScreen(): JSX.Element {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/welcome"} />;
}
