import { captainApi, CaptainRide } from '@/api/captain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

const PINK  = '#E91E8C';
const GREEN = '#10B981';

const STATUS_COLOR: Record<string, string> = {
  completed:  GREEN,
  cancelled:  '#EF4444',
  started:    '#F59E0B',
};

function RideCard({ ride }: { ride: CaptainRide }) {
  const date = new Date(ride.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const statusColor = STATUS_COLOR[ride.status] ?? '#9CA3AF';

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm shadow-black/5">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: PINK + '15' }}
          >
            <MaterialCommunityIcons name="account" size={16} color={PINK} />
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-900">
              {ride.rider.firstName} {ride.rider.lastName}
            </Text>
            <Text className="text-xs text-gray-400">{date}</Text>
          </View>
        </View>
        <View>
          <Text className="text-base font-black text-gray-900">₹{ride.fareEstimate}</Text>
          <View
            className="rounded-full px-2 py-0.5 mt-1 items-center"
            style={{ backgroundColor: statusColor + '15' }}
          >
            <Text className="text-[10px] font-bold capitalize" style={{ color: statusColor }}>
              {ride.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="map-marker-circle" size={14} color={GREEN} />
          <Text className="flex-1 text-xs text-gray-600" numberOfLines={1}>{ride.pickup.address}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="map-marker" size={14} color={PINK} />
          <Text className="flex-1 text-xs text-gray-600" numberOfLines={1}>{ride.destination.address}</Text>
        </View>
      </View>
    </View>
  );
}

export default function RidesScreen() {
  const [rides, setRides]       = useState<CaptainRide[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchRides = async (p = 1) => {
    try {
      const { rides: data, total: t } = await captainApi.getMyRides(p, 10);
      console.log(`📋 [Rides] Loaded page ${p}, total: ${t}`);
      setRides((prev) => (p === 1 ? data : [...prev, ...data]));
      setTotal(t);
      setPage(p);
    } catch (err: any) {
      console.error('❌ [Rides] Failed to load:', err.message);
    }
  };

  useEffect(() => {
    console.log('📋 [Rides] Screen mounted — loading ride history');
    fetchRides(1).finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    if (loadingMore || rides.length >= total) return;
    setLoadingMore(true);
    await fetchRides(page + 1);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F9F8FF] items-center justify-center">
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F8FF]">
      <View className="px-5 pt-14 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-black text-gray-900">Ride History</Text>
        <Text className="text-sm text-gray-500">{total} total rides</Text>
      </View>

      <FlatList
        data={rides}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => <RideCard ride={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={PINK} /> : null}
        ListEmptyComponent={
          <View className="items-center py-16">
            <MaterialCommunityIcons name="history" size={48} color="#D1D5DB" />
            <Text className="text-base font-semibold text-gray-500 mt-3">No rides yet</Text>
            <Text className="text-sm text-gray-400">Complete your first ride to see it here</Text>
          </View>
        }
      />
    </View>
  );
}
