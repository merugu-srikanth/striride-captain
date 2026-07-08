import { captainApi, CaptainRide, PaymentQr } from '@/api/captain';
import CancelReasonModal, { CAPTAIN_CANCEL_REASONS } from '@/components/CancelReasonModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  PanResponder,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PINK   = '#E91E8C';
const GREEN  = '#10B981';
const PURPLE = '#7B1FA2';
const ORANGE = '#F59E0B';
const MAPS_BLUE = '#4285F4';

const CANCELLABLE_STATUSES: CaptainRide['status'][] = ['accepted', 'captain_arrived', 'started'];
const POLL_INTERVAL_MS = 4000;

// Opens turn-by-turn navigation in the Google Maps app (falls back to the
// browser if it isn't installed) rather than navigating inside our own map.
async function openGoogleMapsNavigation(coords: { latitude: number; longitude: number }) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}&travelmode=driving`;
  try {
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('Error', 'Could not open Google Maps.');
  }
}

type RideStatus = CaptainRide['status'];

// ─── PIN Entry boxes ──────────────────────────────────────────────────────────
function PinEntry({ onSubmit, loading }: { onSubmit: (pin: string) => void; loading: boolean }) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  const digits = pin.padEnd(4, ' ').split('');

  return (
    <View className="items-center">
      <Text className="text-2xl font-black text-gray-900 mb-2">Enter Rider PIN</Text>
      <Text className="text-sm text-gray-500 text-center mb-8 px-6">
        Ask the rider for their 4-digit PIN to start the ride
      </Text>

      {/* PIN boxes with a full-size invisible input stretched over them —
          a zero-size hidden input can't reliably take focus on Android */}
      <View className="flex-row gap-4 mb-8">
        {digits.map((d, i) => {
          const filled = i < pin.length;
          const active = i === pin.length;
          return (
            <View
              key={i}
              className="w-16 h-18 rounded-2xl border-2 items-center justify-center"
              style={{
                height: 72,
                borderColor: active ? PINK : filled ? PINK + '70' : '#E5E7EB',
                backgroundColor: filled ? PINK + '08' : '#F9FAFB',
              }}
            >
              <Text className="text-3xl font-black text-gray-900">
                {filled ? d : ''}
              </Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          className="absolute w-full h-full opacity-0"
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          autoFocus
          onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
        />
      </View>

      <TouchableOpacity
        onPress={() => onSubmit(pin)}
        disabled={loading || pin.length !== 4}
        activeOpacity={0.8}
        className="w-full h-14 rounded-2xl items-center justify-center"
        style={{ backgroundColor: pin.length === 4 ? GREEN : '#F3F4F6' }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            className="text-base font-bold"
            style={{ color: pin.length === 4 ? '#fff' : '#9CA3AF' }}
          >
            Start Ride
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Slide to confirm payment received ───────────────────────────────────────
function SlideToConfirm({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const TRACK_HEIGHT = 60;
  const THUMB_SIZE   = 52;
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const maxTranslate = Math.max(trackWidth - THUMB_SIZE - 8, 1);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder:  () => !disabled,
      onPanResponderMove: (_, gesture) => {
        const x = Math.min(Math.max(gesture.dx, 0), maxTranslate);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx >= maxTranslate * 0.8) {
          Animated.timing(translateX, { toValue: maxTranslate, duration: 150, useNativeDriver: true })
            .start(() => onConfirm());
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const textOpacity = translateX.interpolate({
    inputRange: [0, Math.max(maxTranslate * 0.6, 1)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={{
        width: '100%', height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: '#D1FAE5', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      <Animated.Text
        style={{
          position: 'absolute', width: '100%', textAlign: 'center',
          fontWeight: '800', color: '#059669', opacity: textOpacity,
        }}
      >
        Slide to confirm payment received →
      </Animated.Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
          backgroundColor: GREEN, marginLeft: 4,
          alignItems: 'center', justifyContent: 'center',
          transform: [{ translateX }],
        }}
      >
        <MaterialCommunityIcons name="check-bold" size={24} color="#fff" />
      </Animated.View>
    </View>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS: Record<RideStatus, number> = {
  accepted:        0,
  captain_arrived: 1,
  started:         2,
  completed:       3,
  requested:       0,
  cancelled:       0,
  no_captains_available: 0,
};

const STEP_LABELS = ['En Route', 'PIN Entry', 'Active Ride'];

function StepBar({ status }: { status: RideStatus }) {
  const step = STEPS[status] ?? 0;
  return (
    <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
      {STEP_LABELS.map((label, i) => (
        <View key={i} className="flex-1 items-center">
          <View className="flex-row items-center w-full">
            {i > 0 && (
              <View
                className="flex-1 h-0.5"
                style={{ backgroundColor: i <= step ? PINK : '#E5E7EB' }}
              />
            )}
            <View
              className="w-7 h-7 rounded-full items-center justify-center"
              style={{ backgroundColor: i <= step ? PINK : '#F3F4F6' }}
            >
              {i < step ? (
                <MaterialCommunityIcons name="check" size={14} color="#fff" />
              ) : (
                <Text
                  className="text-xs font-bold"
                  style={{ color: i === step ? '#fff' : '#9CA3AF' }}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            {i < STEP_LABELS.length - 1 && (
              <View
                className="flex-1 h-0.5"
                style={{ backgroundColor: i < step ? PINK : '#E5E7EB' }}
              />
            )}
          </View>
          <Text
            className="text-[10px] font-semibold mt-1"
            style={{ color: i <= step ? PINK : '#9CA3AF' }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Ride Screen ─────────────────────────────────────────────────────────
export default function RideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [ride, setRide]       = useState<CaptainRide | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [paymentQr, setPaymentQr]   = useState<PaymentQr | null>(null);
  const [loadingQr, setLoadingQr]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const resolvingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rideId) return;
    console.log('🛵 [Ride] Active ride screen for:', rideId);
    fetchRide();

    // The rider can also cancel mid-ride — poll so we notice even though this
    // screen otherwise only reacts to the captain's own actions.
    pollRef.current = setInterval(async () => {
      if (resolvingRef.current) return;
      try {
        const active = await captainApi.getActiveRide();
        if (!active) {
          clearInterval(pollRef.current!);
          console.log('🔄 [Ride] Ride no longer active — likely cancelled by rider');
          Alert.alert('Ride Cancelled', 'This ride was cancelled by the rider.');
          router.replace('/(tabs)/home');
          return;
        }
        setRide(active);
      } catch (err: any) {
        console.warn('🔄 [Ride] Poll error (will retry):', err?.message);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current!);
  }, [rideId]);

  const fetchRide = async () => {
    try {
      const active = await captainApi.getActiveRide();
      if (active) {
        setRide(active);
        console.log('✅ [Ride] Loaded active ride status:', active.status);
      }
    } catch (err: any) {
      console.error('❌ [Ride] Failed to load ride:', err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleArrive = async () => {
    if (!ride) return;
    console.log('🏁 [Ride] Marking captain arrived:', rideId);
    setLoading(true);
    try {
      const updated = await captainApi.arriveAtPickup(ride._id);
      setRide(updated);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async (pin: string) => {
    if (!ride) return;
    console.log('🛵 [Ride] Starting ride with PIN:', pin);
    setLoading(true);
    try {
      const updated = await captainApi.startRide(ride._id, pin);
      setRide(updated);
    } catch (err: any) {
      Alert.alert('Wrong PIN', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tapping "Complete Ride" first generates the UPI payment QR — the ride
  // itself isn't marked completed until the captain slides to confirm she's
  // actually received the money.
  const handleGeneratePaymentQr = async () => {
    if (!ride) return;
    console.log('💳 [Ride] Generating payment QR:', rideId);
    setLoadingQr(true);
    try {
      const qr = await captainApi.getPaymentQr(ride._id);
      setPaymentQr(qr);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!ride) return;
    console.log('🏆 [Ride] Payment confirmed, completing ride:', rideId);
    resolvingRef.current = true;
    setConfirming(true);
    try {
      await captainApi.completeRide(ride._id);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setConfirming(false);
      resolvingRef.current = false;
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!ride) return;
    console.log('🚫 [Ride] Cancelling ride:', rideId, '| reason:', reason);
    resolvingRef.current = true;
    setCancelling(true);
    try {
      await captainApi.cancelRide(ride._id, reason);
      setShowCancelModal(false);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message);
      resolvingRef.current = false;
    } finally {
      setCancelling(false);
    }
  };

  if (fetching) {
    return (
      <View className="flex-1 bg-[#F9F8FF] items-center justify-center">
        <ActivityIndicator size="large" color={PINK} />
        <Text className="text-sm text-gray-500 mt-3">Loading ride...</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View className="flex-1 bg-[#F9F8FF] items-center justify-center px-6">
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text className="text-base font-semibold text-gray-500 mt-3 text-center">
          Couldn't load ride details
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          className="mt-4 px-6 py-3 rounded-2xl"
          style={{ backgroundColor: PINK }}
        >
          <Text className="text-white font-bold">Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F8FF]">
      {/* Step bar */}
      <View className="pt-12">
        <StepBar status={ride.status} />
      </View>

      <View className="flex-1 px-5 pt-6">
        {/* Rider card (always visible) */}
        <View className="bg-white rounded-3xl p-4 mb-4 shadow-sm shadow-black/5">
          <View className="flex-row items-center gap-3">
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: PINK + '15' }}
            >
              <MaterialCommunityIcons name="account" size={22} color={PINK} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {ride.rider.firstName} {ride.rider.lastName}
              </Text>
              <Text className="text-xs text-gray-500">{ride.rider.phone}</Text>
            </View>
            <View className="items-end">
              <Text className="text-lg font-black text-gray-900">₹{ride.fareEstimate}</Text>
              <Text className="text-xs text-gray-500">{ride.distanceKm.toFixed(1)} km</Text>
            </View>
          </View>
        </View>

        {/* Route */}
        <View className="bg-white rounded-3xl p-4 mb-5 shadow-sm shadow-black/5 gap-2">
          <View className="flex-row items-start gap-3">
            <MaterialCommunityIcons name="map-marker-circle" size={18} color={GREEN} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold text-gray-400 uppercase">Pickup</Text>
              <Text className="text-sm font-semibold text-gray-800" numberOfLines={2}>{ride.pickup.address}</Text>
            </View>
          </View>
          <View className="ml-[9px] w-px h-4 bg-gray-200" />
          <View className="flex-row items-start gap-3">
            <MaterialCommunityIcons name="map-marker" size={18} color={PINK} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold text-gray-400 uppercase">Drop</Text>
              <Text className="text-sm font-semibold text-gray-800" numberOfLines={2}>{ride.destination.address}</Text>
            </View>
          </View>
        </View>

        {/* Action area based on status */}
        {ride.status === 'accepted' && (
          <View className="items-center">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: ORANGE + '15' }}
            >
              <MaterialCommunityIcons name="navigation" size={36} color={ORANGE} />
            </View>
            <Text className="text-lg font-black text-gray-900 mb-1">Navigate to Pickup</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              Head to the pickup location.{'\n'}Tap when you arrive.
            </Text>
            <TouchableOpacity
              onPress={() => openGoogleMapsNavigation(ride.pickup.coordinates)}
              activeOpacity={0.8}
              className="w-full h-14 rounded-2xl items-center justify-center flex-row gap-2 mb-3"
              style={{ backgroundColor: MAPS_BLUE }}
            >
              <MaterialCommunityIcons name="google-maps" size={20} color="#fff" />
              <Text className="text-base font-bold text-white">Navigate with Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleArrive}
              disabled={loading}
              activeOpacity={0.8}
              className="w-full h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: ORANGE }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">I've Arrived at Pickup</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {ride.status === 'captain_arrived' && (
          <PinEntry onSubmit={handleStartRide} loading={loading} />
        )}

        {ride.status === 'started' && !paymentQr && (
          <View className="items-center">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: GREEN + '15' }}
            >
              <MaterialCommunityIcons name="motorbike" size={36} color={GREEN} />
            </View>
            <Text className="text-lg font-black text-gray-900 mb-1">Ride In Progress</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              Navigate to the drop location.{'\n'}
              Collect ₹{ride.fareEstimate} via UPI from the rider.
            </Text>
            <TouchableOpacity
              onPress={() => openGoogleMapsNavigation(ride.destination.coordinates)}
              activeOpacity={0.8}
              className="w-full h-14 rounded-2xl items-center justify-center flex-row gap-2 mb-3"
              style={{ backgroundColor: MAPS_BLUE }}
            >
              <MaterialCommunityIcons name="google-maps" size={20} color="#fff" />
              <Text className="text-base font-bold text-white">Navigate with Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGeneratePaymentQr}
              disabled={loadingQr}
              activeOpacity={0.8}
              className="w-full h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: GREEN }}
            >
              {loadingQr ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">Complete Ride</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {ride.status === 'started' && paymentQr && (
          <View className="items-center">
            <Text className="text-lg font-black text-gray-900 mb-1">Collect Payment</Text>
            <Text className="text-sm text-gray-500 text-center mb-5">
              Ask the rider to scan this code to pay ₹{paymentQr.amount} via UPI
            </Text>

            <View
              className="bg-white rounded-3xl p-4 mb-4 items-center"
              style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}
            >
              <Image
                source={{ uri: paymentQr.qrCode }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
              <Text className="text-2xl font-black text-gray-900 mt-3">₹{paymentQr.amount}</Text>
              <Text className="text-xs text-gray-400 mt-1">{paymentQr.upiId}</Text>
            </View>

            <View className="w-full mt-2">
              <SlideToConfirm onConfirm={handleConfirmPayment} disabled={confirming} />
              {confirming && (
                <View className="flex-row items-center justify-center gap-2 mt-3">
                  <ActivityIndicator color={GREEN} />
                  <Text className="text-sm text-gray-500">Completing ride…</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cancel — allowed any time before payment collection starts */}
        {CANCELLABLE_STATUSES.includes(ride.status) && !paymentQr && (
          <TouchableOpacity
            onPress={() => setShowCancelModal(true)}
            disabled={cancelling}
            className="border-[1.5px] border-gray-200 rounded-2xl py-3.5 items-center mt-4"
          >
            <Text className="text-sm font-bold text-gray-500">
              {cancelling ? 'Cancelling…' : 'Cancel Ride'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <CancelReasonModal
        visible={showCancelModal}
        reasons={CAPTAIN_CANCEL_REASONS}
        submitting={cancelling}
        onDismiss={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}
