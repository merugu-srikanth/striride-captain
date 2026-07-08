import { useAuthStore } from '@/store/authStore';
import { Redirect, Stack } from 'expo-router';

export default function RideLayout() {
  const { token, isLoading } = useAuthStore();

  // Same reactive guard as (tabs) — the ride screen polls every 4s and must
  // unmount if the session dies mid-ride.
  if (!isLoading && !token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
