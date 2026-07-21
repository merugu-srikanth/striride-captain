import { authApi } from '@/api/auth';
import { useToast } from '@/components/Toast';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PINK = '#E91E8C';
const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setToken } = useAuthStore();
  const toast = useToast();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRef = useRef<TextInput>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    console.log('🔑 [Verify] OTP screen for captain phone:', phone);
    inputRef.current?.focus();
    startResendTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(30);
    intervalRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(intervalRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    console.log('🔑 [Verify] Submitting OTP:', otp, 'for phone:', phone);
    setLoading(true);
    try {
      const { token, user } = await authApi.loginVerify(phone!, otp);
      if (user.role !== 'captain') {
        toast.error('Access denied', 'This app is for captains only.');
        return;
      }
      await setToken(token, user);
      console.log('✅ [Verify] Captain logged in:', user.firstName);
      router.replace('/(tabs)');
    } catch (err: any) {
      toast.error('Invalid OTP', err.message);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !phone) return;
    try {
      await authApi.loginRequest(phone);
      startResendTimer();
      toast.success('OTP sent', 'A new OTP has been sent to your number.');
    } catch (err: any) {
      toast.error('Could not resend OTP', err.message);
    }
  };

  const digits = otp.padEnd(OTP_LENGTH, ' ').split('');

  return (
    <View className="flex-1 bg-white px-6 pt-16 pb-10">
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
      </TouchableOpacity>

      <Text className="text-3xl font-black text-gray-900 tracking-tight mb-2">Verify OTP</Text>
      <Text className="text-sm text-gray-500 mb-10">
        Enter the 6-digit code sent to{' '}
        <Text className="font-bold text-gray-700">+91 {phone}</Text>
      </Text>

      {/* OTP boxes with a full-size invisible input stretched over them —
          a zero-size hidden input can't reliably take focus on Android */}
      <View className="flex-row justify-center gap-3 mb-10">
        {digits.map((d, i) => {
          const filled = i < otp.length;
          const active = i === otp.length;
          return (
            <View
              key={i}
              className="w-12 h-14 rounded-xl border-2 items-center justify-center"
              style={{
                borderColor: active ? PINK : filled ? PINK + '60' : '#E5E7EB',
                backgroundColor: filled ? PINK + '08' : '#F9FAFB',
              }}
            >
              <Text className="text-2xl font-black text-gray-900">
                {filled ? d : ''}
              </Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          className="absolute w-full h-full opacity-0"
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          value={otp}
          autoFocus
          onChangeText={(t) => { setOtp(t.replace(/\D/g, '')); }}
          onSubmitEditing={handleVerify}
        />
      </View>

      {/* Verify button */}
      <TouchableOpacity
        onPress={handleVerify}
        disabled={loading || otp.length !== OTP_LENGTH}
        activeOpacity={0.8}
        className="h-[56px] rounded-2xl items-center justify-center mb-5"
        style={{ backgroundColor: otp.length === OTP_LENGTH ? PINK : '#F3F4F6' }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            className="text-base font-bold"
            style={{ color: otp.length === OTP_LENGTH ? '#fff' : '#9CA3AF' }}
          >
            Verify &amp; Login
          </Text>
        )}
      </TouchableOpacity>

      {/* Resend */}
      <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0} className="items-center">
        <Text className="text-sm text-gray-500">
          Didn't receive?{' '}
          <Text
            className="font-bold"
            style={{ color: resendTimer > 0 ? '#9CA3AF' : PINK }}
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
