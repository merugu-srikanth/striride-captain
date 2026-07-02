import { apiClient } from './client';

export interface AuthUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  loginRequest: async (phone: string): Promise<void> => {
    console.log('📱 [Auth] Requesting OTP for captain:', phone);
    await apiClient.post('/auth/login/request', { phone: `+91${phone}` });
  },

  loginVerify: async (phone: string, otp: string): Promise<AuthResponse> => {
    console.log('🔑 [Auth] Verifying OTP for captain:', phone);
    const response = await apiClient.post('/auth/login/verify', {
      phone: `+91${phone}`,
      otp,
    });
    return response.data.data;
  },
};
