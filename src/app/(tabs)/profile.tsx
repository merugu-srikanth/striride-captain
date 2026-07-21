import { captainApi } from '@/api/captain';
import { useToast } from '@/components/Toast';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const PINK   = '#E91E8C';
const PURPLE = '#7B1FA2';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [upiId, setUpiId]       = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const toast = useToast();

  useEffect(() => {
    console.log('👤 [Profile] Loading captain profile');
    captainApi.getProfile()
      .then((data) => {
        setProfile(data);
        setUpiId(data?.profile?.upiId ?? '');
        console.log('✅ [Profile] Loaded profile');
      })
      .catch((err: any) => console.error('❌ [Profile] Failed:', err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveUpi = async () => {
    if (!upiId.trim()) return;
    setSavingUpi(true);
    try {
      await captainApi.updateUpi(upiId.trim());
      toast.success('Saved', 'Your UPI ID has been updated.');
    } catch (err: any) {
      toast.error('Could not save', err.message);
    } finally {
      setSavingUpi(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await captainApi.updateStatus('offline').catch(() => {});
          logout();
          console.log('🚪 [Profile] Captain logged out');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F9F8FF] items-center justify-center">
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  const rows = [
    { icon: 'phone', label: 'Phone',    value: user?.phone ?? '—' },
    { icon: 'car',   label: 'Vehicle',  value: profile?.profile?.vehicle?.type ?? '—' },
    { icon: 'license', label: 'Plate', value: profile?.profile?.vehicle?.plate ?? '—' },
    { icon: 'card-account-details', label: 'License', value: profile?.profile?.licenseNumber ?? '—' },
  ];

  const verified = profile?.profile?.isDocumentVerified;

  return (
    <ScrollView className="flex-1 bg-[#F9F8FF]" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-5 pt-14 pb-8 items-center" style={{ backgroundColor: PINK }}>
        <View className="w-20 h-20 rounded-full bg-white/25 items-center justify-center mb-3">
          <MaterialCommunityIcons name="account" size={40} color="#fff" />
        </View>
        <Text className="text-xl font-black text-white">
          {user?.firstName} {user?.lastName}
        </Text>
        <View
          className="flex-row items-center gap-1.5 mt-2 rounded-full px-3 py-1"
          style={{ backgroundColor: verified ? '#D1FAE5' : '#FEF3C7' }}
        >
          <MaterialCommunityIcons
            name={verified ? 'check-circle' : 'clock-outline'}
            size={13}
            color={verified ? '#059669' : '#D97706'}
          />
          <Text
            className="text-xs font-bold"
            style={{ color: verified ? '#059669' : '#D97706' }}
          >
            {verified ? 'Documents Verified' : 'Verification Pending'}
          </Text>
        </View>
      </View>

      <View className="px-5 -mt-3">
        {/* Info card */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-black/5">
          {rows.map(({ icon, label, value }, i) => (
            <View key={i} className={`flex-row items-center gap-3 py-3 ${i < rows.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: PINK + '12' }}
              >
                <MaterialCommunityIcons name={icon as any} size={18} color={PINK} />
              </View>
              <View>
                <Text className="text-xs text-gray-400">{label}</Text>
                <Text className="text-sm font-semibold text-gray-800">{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* UPI ID card — used to generate the payment QR after a ride completes */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-black/5">
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">Payment UPI ID</Text>
          <View
            className="flex-row items-center gap-3 rounded-2xl border-2 px-4 mb-3"
            style={{ borderColor: '#E5E7EB' }}
          >
            <MaterialCommunityIcons name="qrcode" size={18} color={PINK} />
            <TextInput
              value={upiId}
              onChangeText={setUpiId}
              placeholder="yourname@upi"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              className="flex-1 py-3.5 text-sm font-semibold text-gray-800"
            />
          </View>
          <TouchableOpacity
            onPress={handleSaveUpi}
            disabled={savingUpi || !upiId.trim()}
            activeOpacity={0.8}
            className="h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: upiId.trim() ? PINK : '#F3F4F6' }}
          >
            {savingUpi ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm font-bold" style={{ color: upiId.trim() ? '#fff' : '#9CA3AF' }}>
                Save UPI ID
              </Text>
            )}
          </TouchableOpacity>
          <Text className="text-xs text-gray-400 mt-2">
            Riders scan a QR generated from this UPI ID to pay you after each ride.
          </Text>
        </View>

        {/* Rating card */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-black/5 flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
            <MaterialCommunityIcons name="star" size={24} color="#F59E0B" />
          </View>
          <View>
            <Text className="text-xs text-gray-400">Average Rating</Text>
            <Text className="text-2xl font-black text-gray-900">
              {profile?.profile?.ratingAvg?.toFixed(1) ?? '—'}
            </Text>
          </View>
          <View className="flex-1" />
          <View>
            <Text className="text-xs text-gray-400">Total Rides</Text>
            <Text className="text-2xl font-black text-gray-900">
              {profile?.profile?.totalRides ?? 0}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="bg-white rounded-3xl p-4 mb-8 flex-row items-center gap-3 shadow-sm shadow-black/5"
        >
          <View className="w-9 h-9 rounded-full bg-red-50 items-center justify-center">
            <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
          </View>
          <Text className="text-base font-semibold text-red-500">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
