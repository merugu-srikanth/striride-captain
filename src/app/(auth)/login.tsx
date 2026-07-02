import { authApi } from '@/api/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PINK = '#E91E8C';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const trimmed = phone.trim();
    if (trimmed.length !== 10 || !/^\d{10}$/.test(trimmed)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    console.log('📱 [Login] Requesting OTP for captain phone:', trimmed);
    setLoading(true);
    try {
      await authApi.loginRequest(trimmed);
      router.push({ pathname: '/(auth)/verify', params: { phone: trimmed } });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 pt-20 pb-10">
        {/* Header */}
        <View className="items-center mb-12">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: PINK + '15' }}
          >
            <MaterialCommunityIcons name="motorbike" size={40} color={PINK} />
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">StriRide</Text>
          <Text className="text-base font-semibold text-[#E91E8C] mt-1">Captain App</Text>
          <Text className="text-sm text-gray-500 mt-3 text-center">
            Enter your registered captain mobile number{'\n'}to receive an OTP
          </Text>
        </View>

        {/* Phone input */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Mobile Number</Text>
          <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 h-[56px]">
            <Text className="text-base font-semibold text-gray-500 mr-2">+91</Text>
            <View className="w-px h-5 bg-gray-300 mr-3" />
            <TextInput
              className="flex-1 text-base font-semibold text-gray-900"
              placeholder="10-digit number"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>
        </View>

        {/* Send OTP button */}
        <TouchableOpacity
          onPress={handleSendOtp}
          disabled={loading || phone.length !== 10}
          activeOpacity={0.8}
          className="h-[56px] rounded-2xl items-center justify-center"
          style={{ backgroundColor: phone.length === 10 ? PINK : '#F3F4F6' }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className="text-base font-bold"
              style={{ color: phone.length === 10 ? '#fff' : '#9CA3AF' }}
            >
              Send OTP
            </Text>
          )}
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          Captain accounts are created by admin.{'\n'}
          Contact StriRide if you don't have an account.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
