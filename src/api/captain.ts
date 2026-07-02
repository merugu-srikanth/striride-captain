import { apiClient } from './client';

export interface CaptainRide {
  _id: string;
  rider: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    profilePhoto?: string;
  };
  pickup: { address: string; coordinates: { latitude: number; longitude: number } };
  destination: { address: string; coordinates: { latitude: number; longitude: number } };
  distanceKm: number;
  fareEstimate: number;
  status: 'requested' | 'accepted' | 'captain_arrived' | 'started' | 'completed' | 'cancelled' | 'no_captains_available';
  startPin: string;
  createdAt: string;
  acceptedAt?: string;
  captainArrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface EarningsSummary {
  today: { earnings: number; rides: number };
  allTime: { earnings: number; rides: number };
  ratingAvg: number;
  dutyStatus: 'online' | 'offline' | 'break' | 'on_ride';
}

export const captainApi = {
  updateLocation: async (latitude: number, longitude: number) => {
    console.log('📍 [Captain] Pushing location:', { latitude, longitude });
    await apiClient.patch('/captain/location', { latitude, longitude });
  },

  updateStatus: async (status: 'online' | 'offline' | 'break') => {
    console.log('🔄 [Captain] Updating status →', status);
    const res = await apiClient.patch('/captain/status', { status });
    return res.data.data;
  },

  getActiveRide: async (): Promise<CaptainRide | null> => {
    const res = await apiClient.get('/captain/ride/active');
    return res.data.data;
  },

  getPendingRide: async (): Promise<CaptainRide | null> => {
    const res = await apiClient.get('/captain/ride/pending');
    return res.data.data;
  },

  acceptRide: async (rideId: string): Promise<CaptainRide> => {
    console.log('✅ [Captain] Accepting ride:', rideId);
    const res = await apiClient.patch(`/captain/rides/${rideId}/accept`);
    return res.data.data;
  },

  declineRide: async (rideId: string) => {
    console.log('❌ [Captain] Declining ride:', rideId);
    await apiClient.patch(`/captain/rides/${rideId}/decline`);
  },

  arriveAtPickup: async (rideId: string): Promise<CaptainRide> => {
    console.log('🏁 [Captain] Arrived at pickup:', rideId);
    const res = await apiClient.patch(`/captain/rides/${rideId}/arrive`);
    return res.data.data;
  },

  startRide: async (rideId: string, pin: string): Promise<CaptainRide> => {
    console.log('🛵 [Captain] Starting ride with PIN:', rideId);
    const res = await apiClient.patch(`/captain/rides/${rideId}/start`, { pin });
    return res.data.data;
  },

  completeRide: async (rideId: string): Promise<CaptainRide> => {
    console.log('🏆 [Captain] Completing ride:', rideId);
    const res = await apiClient.patch(`/captain/rides/${rideId}/complete`);
    return res.data.data;
  },

  getEarnings: async (): Promise<EarningsSummary> => {
    const res = await apiClient.get('/captain/earnings');
    return res.data.data;
  },

  getProfile: async () => {
    const res = await apiClient.get('/captain/profile');
    return res.data.data;
  },

  getMyRides: async (page = 1, limit = 10) => {
    const res = await apiClient.get('/captain/rides', { params: { page, limit } });
    return { rides: res.data.data as CaptainRide[], total: res.data.meta?.total ?? 0 };
  },
};
