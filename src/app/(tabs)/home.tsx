import { captainApi, CaptainRide, EarningsSummary } from '@/api/captain';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PINK    = '#E91E8C';
const PURPLE  = '#7B1FA2';
const GREEN   = '#10B981';
const ORANGE  = '#F59E0B';

const POLL_INTERVAL_MS     = 5000;
const LOCATION_INTERVAL_MS = 30000;

type DutyStatus = 'online' | 'offline' | 'break' | 'on_ride';

const STATUS_CONFIG: Record<DutyStatus, { label: string; color: string; bg: string }> = {
  online:   { label: 'Online',   color: GREEN,  bg: '#D1FAE5' },
  offline:  { label: 'Offline',  color: '#6B7280', bg: '#F3F4F6' },
  break:    { label: 'On Break', color: ORANGE, bg: '#FEF3C7' },
  on_ride:  { label: 'On Ride',  color: PINK,   bg: '#FCE7F3' },
};

// ─── 30-second countdown ring ────────────────────────────────────────────────
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const SIZE  = 64;
  const R     = 26;
  const CIRC  = 2 * Math.PI * R;
  const pct   = seconds / total;
  const color = seconds <= 10 ? '#EF4444' : ORANGE;

  return (
    <View className="items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <Text className="absolute text-lg font-black" style={{ color }}>{seconds}</Text>
    </View>
  );
}

// ─── Incoming Ride Card (Modal) ───────────────────────────────────────────────
function IncomingRideModal({
  ride,
  onAccept,
  onDecline,
  countdown,
}: {
  ride: CaptainRide;
  onAccept: () => void;
  onDecline: () => void;
  countdown: number;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const urgentColor = countdown <= 10 ? '#EF4444' : ORANGE;

  return (
    <Modal transparent animationType="slide" visible statusBarTranslucent>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Animated.View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PINK, transform: [{ scale: pulseAnim }] }}
              />
              <Text className="text-lg font-black text-gray-900">New Ride Request!</Text>
            </View>
            <View
              className="w-14 h-14 rounded-full items-center justify-center border-2"
              style={{ borderColor: urgentColor }}
            >
              <Text className="text-xl font-black" style={{ color: urgentColor }}>
                {countdown}
              </Text>
              <Text className="text-[9px] text-gray-400 -mt-0.5">sec</Text>
            </View>
          </View>

          {/* Rider info */}
          <View className="flex-row items-center gap-3 mb-4 p-3 rounded-2xl bg-gray-50">
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: PINK + '20' }}
            >
              <MaterialCommunityIcons name="account" size={26} color={PINK} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {ride.rider.firstName} {ride.rider.lastName}
              </Text>
              <Text className="text-xs text-gray-500">{ride.rider.phone}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xl font-black text-gray-900">₹{ride.fareEstimate}</Text>
              <Text className="text-xs text-gray-500">{ride.distanceKm.toFixed(1)} km</Text>
            </View>
          </View>

          {/* Pickup → Drop */}
          <View className="mb-5 gap-2">
            <View className="flex-row items-start gap-3">
              <MaterialCommunityIcons name="map-marker-circle" size={20} color={GREEN} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-gray-500 uppercase">Pickup</Text>
                <Text className="text-sm font-semibold text-gray-800" numberOfLines={2}>
                  {ride.pickup.address}
                </Text>
              </View>
            </View>
            <View className="ml-[11px] w-px h-4 bg-gray-200" />
            <View className="flex-row items-start gap-3">
              <MaterialCommunityIcons name="map-marker" size={20} color={PINK} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-gray-500 uppercase">Drop</Text>
                <Text className="text-sm font-semibold text-gray-800" numberOfLines={2}>
                  {ride.destination.address}
                </Text>
              </View>
            </View>
          </View>

          {/* Cash badge */}
          <View className="flex-row items-center gap-2 mb-6">
            <View className="bg-green-50 border border-green-200 rounded-full px-3 py-1 flex-row items-center gap-1">
              <MaterialCommunityIcons name="cash" size={14} color={GREEN} />
              <Text className="text-xs font-bold text-green-700">Cash Payment</Text>
            </View>
          </View>

          {/* Accept / Decline */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onDecline}
              activeOpacity={0.8}
              className="flex-1 h-14 rounded-2xl border-2 border-gray-200 items-center justify-center"
            >
              <Text className="text-base font-bold text-gray-500">Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onAccept}
              activeOpacity={0.8}
              className="flex-[2] h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: GREEN }}
            >
              <Text className="text-base font-bold text-white">Accept Ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Home Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, logout } = useAuthStore();

  const [dutyStatus, setDutyStatus]       = useState<DutyStatus>('offline');
  const [earnings, setEarnings]           = useState<EarningsSummary | null>(null);
  const [pendingRide, setPendingRide]     = useState<CaptainRide | null>(null);
  const [countdown, setCountdown]         = useState(30);
  const [statusLoading, setStatusLoading] = useState(false);

  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRideIdRef = useRef<string | null>(null);

  // Fetch earnings on mount and after every status change
  const fetchEarnings = useCallback(async () => {
    try {
      const data = await captainApi.getEarnings();
      setEarnings(data);
      setDutyStatus(data.dutyStatus);
      console.log('💰 [Home] Earnings loaded, status:', data.dutyStatus);
    } catch (err: any) {
      console.error('❌ [Home] Earnings fetch failed:', err.message);
    }
  }, []);

  useEffect(() => {
    console.log('🏠 [Home] Screen mounted — fetching earnings');
    fetchEarnings();
  }, []);

  // Poll for pending ride when online
  const startPolling = useCallback(() => {
    console.log('🔄 [Home] Starting ride poll every 5s');
    pollRef.current = setInterval(async () => {
      try {
        const ride = await captainApi.getPendingRide();
        if (ride && ride._id !== pendingRideIdRef.current) {
          console.log('🔔 [Home] New ride received:', ride._id);
          pendingRideIdRef.current = ride._id;
          setPendingRide(ride);
          startCountdown();
        } else if (!ride && pendingRideIdRef.current) {
          console.log('⏰ [Home] Ride expired (no response from captain)');
          pendingRideIdRef.current = null;
          setPendingRide(null);
          stopCountdown();
        }
      } catch (err: any) {
        console.error('❌ [Home] Poll error:', err.message);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Location push
  const startLocationPush = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ [Home] Location permission denied');
      return;
    }
    console.log('📍 [Home] Starting location push every 30s');

    const push = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await captainApi.updateLocation(loc.coords.latitude, loc.coords.longitude);
      } catch (err: any) {
        console.error('❌ [Home] Location push failed:', err.message);
      }
    };
    push();
    locationRef.current = setInterval(push, LOCATION_INTERVAL_MS);
  }, []);

  const stopLocationPush = useCallback(() => {
    if (locationRef.current) { clearInterval(locationRef.current); locationRef.current = null; }
  }, []);

  // Countdown for incoming ride
  const startCountdown = () => {
    stopCountdown();
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          stopCountdown();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  useEffect(() => {
    if (dutyStatus === 'online') {
      startPolling();
      startLocationPush();
    } else {
      stopPolling();
      stopLocationPush();
      setPendingRide(null);
      pendingRideIdRef.current = null;
      stopCountdown();
    }
    return () => { stopPolling(); stopLocationPush(); stopCountdown(); };
  }, [dutyStatus]);

  // Change status
  const handleStatusChange = async (newStatus: 'online' | 'offline' | 'break') => {
    if (dutyStatus === 'on_ride') {
      Alert.alert('On a Ride', 'Complete your current ride before changing status.');
      return;
    }
    console.log('🔄 [Home] Changing status to:', newStatus);
    setStatusLoading(true);
    try {
      await captainApi.updateStatus(newStatus);
      setDutyStatus(newStatus);
      await fetchEarnings();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  // Accept ride
  const handleAccept = async () => {
    if (!pendingRide) return;
    stopPolling();
    stopCountdown();
    console.log('✅ [Home] Accepting ride:', pendingRide._id);
    try {
      await captainApi.acceptRide(pendingRide._id);
      const rideId = pendingRide._id;
      setPendingRide(null);
      pendingRideIdRef.current = null;
      setDutyStatus('on_ride');
      router.push({ pathname: '/(ride)/[rideId]', params: { rideId } });
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setPendingRide(null);
      pendingRideIdRef.current = null;
      startPolling();
    }
  };

  // Decline ride
  const handleDecline = async () => {
    if (!pendingRide) return;
    stopCountdown();
    console.log('❌ [Home] Declining ride:', pendingRide._id);
    try {
      await captainApi.declineRide(pendingRide._id);
    } catch (err: any) {
      console.error('❌ [Home] Decline API error:', err.message);
    } finally {
      setPendingRide(null);
      pendingRideIdRef.current = null;
    }
  };

  const handleGoToActiveRide = async () => {
    try {
      const active = await captainApi.getActiveRide();
      if (active) {
        router.push({ pathname: '/(ride)/[rideId]', params: { rideId: active._id } });
      } else {
        Alert.alert('No Active Ride', 'Could not find your current ride.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          if (dutyStatus === 'online') await captainApi.updateStatus('offline').catch(() => {});
          logout();
          console.log('🚪 [Home] Captain logged out');
        },
      },
    ]);
  };

  const cfg = STATUS_CONFIG[dutyStatus];

  return (
    <View className="flex-1 bg-[#F9F8FF]">
      {/* Incoming ride modal */}
      {pendingRide && (
        <IncomingRideModal
          ride={pendingRide}
          countdown={countdown}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          className="px-5 pt-14 pb-6"
          style={{ backgroundColor: PINK }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white/70 text-sm font-medium">Welcome back 👋</Text>
              <Text className="text-white text-xl font-black">{user?.firstName} {user?.lastName}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} className="bg-white/20 rounded-full p-2">
              <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Status pill */}
          <View
            className="self-start flex-row items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: cfg.bg }}
          >
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            <Text className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</Text>
          </View>
        </View>

        <View className="px-5 -mt-4">
          {/* Earnings card */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-black/5">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">Today's Earnings</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-black text-gray-900">
                  ₹{earnings?.today.earnings ?? 0}
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  {earnings?.today.rides ?? 0} rides completed
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-400">All Time</Text>
                <Text className="text-lg font-bold text-gray-700">
                  ₹{earnings?.allTime.earnings ?? 0}
                </Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <MaterialCommunityIcons name="star" size={12} color={ORANGE} />
                  <Text className="text-xs font-semibold text-gray-600">
                    {earnings?.ratingAvg?.toFixed(1) ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Status toggle buttons */}
          {dutyStatus !== 'on_ride' && (
            <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-black/5">
              <Text className="text-xs font-semibold text-gray-500 uppercase mb-3">Change Status</Text>
              <View className="flex-row gap-3">
                {(['online', 'break', 'offline'] as const).map((s) => {
                  const c = STATUS_CONFIG[s];
                  const active = dutyStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => handleStatusChange(s)}
                      disabled={statusLoading || active}
                      activeOpacity={0.7}
                      className="flex-1 h-12 rounded-2xl items-center justify-center border-2"
                      style={{
                        backgroundColor: active ? c.bg : '#F9FAFB',
                        borderColor: active ? c.color : '#E5E7EB',
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: active ? c.color : '#9CA3AF' }}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* On ride active card */}
          {dutyStatus === 'on_ride' && (
            <TouchableOpacity
              onPress={handleGoToActiveRide}
              className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-black/5 flex-row items-center gap-3"
              activeOpacity={0.8}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: PINK + '15' }}
              >
                <MaterialCommunityIcons name="motorbike" size={24} color={PINK} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">Ride In Progress</Text>
                <Text className="text-sm text-gray-500">You're currently on a ride</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Tip when online */}
          {dutyStatus === 'online' && !pendingRide && (
            <View className="items-center py-10">
              <MaterialCommunityIcons name="radar" size={48} color={PINK + '40'} />
              <Text className="text-base font-semibold text-gray-500 mt-3 text-center">
                Looking for ride requests…{'\n'}
                <Text className="text-sm font-normal text-gray-400">Stay put and we'll alert you!</Text>
              </Text>
            </View>
          )}

          {/* Tip when offline */}
          {dutyStatus === 'offline' && (
            <View className="items-center py-10">
              <MaterialCommunityIcons name="power-sleep" size={48} color="#D1D5DB" />
              <Text className="text-base font-semibold text-gray-500 mt-3 text-center">
                You're Offline{'\n'}
                <Text className="text-sm font-normal text-gray-400">Go Online to start receiving rides</Text>
              </Text>
            </View>
          )}

          {dutyStatus === 'break' && (
            <View className="items-center py-10">
              <MaterialCommunityIcons name="coffee" size={48} color={ORANGE + '80'} />
              <Text className="text-base font-semibold text-gray-500 mt-3 text-center">
                Enjoy your break!{'\n'}
                <Text className="text-sm font-normal text-gray-400">Go Online when you're ready</Text>
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
