import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function RootIndex() {
  const { isLoading, token, checkAuthStatus } = useAuthStore();

  useEffect(() => {
    console.log('🚀 [Captain App] Checking auth status...');
    checkAuthStatus();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#E91E8C] items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
