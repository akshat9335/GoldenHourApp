import Constants from 'expo-constants';

/**
 * Centralized Golden Hour App API Client
 * Single canonical entry point for all frontend-to-backend communication.
 */

function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:5000`;
    }
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = resolveApiBaseUrl();

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/+$/, '')}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = (await res.json().catch(() => ({}))) as ApiResponse<T>;

  if (!res.ok || body.success === false) {
    const errorMsg =
      body.error?.message || body.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg) as Error & { code?: string; status?: number };
    err.code = body.error?.code;
    err.status = res.status;
    throw err;
  }

  return (body.data !== undefined ? body.data : body) as T;
}

export const api = {
  // Authentication & Session
  auth: {
    createSession: () => request('/auth/session', { method: 'POST' }),
    getMe: () => request('/auth/me'),
  },

  // Users & Registration
  users: {
    getProfile: () => request('/users/me'),
    register: (data: any) => request('/users/register', { method: 'POST', body: JSON.stringify(data) }),
    updateProfile: (data: any) => request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    getEmergencyContacts: () => request('/contacts'),
    addEmergencyContact: (data: any) => request('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    deleteEmergencyContact: (id: string) => request(`/contacts/${id}`, { method: 'DELETE' }),
  },

  // Canonical Emergencies
  emergencies: {
    create: (input: {
      incidentType: string;
      description?: string | null;
      voiceTranscript?: string | null;
      imageUrl?: string | null;
      location: { latitude: number; longitude: number };
      locationAddress?: string | null;
      severity?: string | null;
      aiResult?: any;
    }) => request('/emergencies', { method: 'POST', body: JSON.stringify(input) }),
    getById: (id: string) => request(`/emergencies/${id}`),
    update: (id: string, updates: any) =>
      request(`/emergencies/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  },

  // Confirmations (Multi-user concurrency & verification)
  confirmations: {
    // Backend expects POST /confirmations with body {emergencyId, location}
    confirm: (emergencyId: string, location?: { latitude: number; longitude: number }) =>
      request('/confirmations', {
        method: 'POST',
        body: JSON.stringify({ emergencyId, ...(location ? { location } : {}) }),
      }),
    getCount: (emergencyId: string) => request<{ count: number }>(`/confirmations/${emergencyId}/count`),
    getMyStatus: (emergencyId: string) => request(`/confirmations/${emergencyId}/me`),
    getIncidentConfirmations: (emergencyId: string) => request(`/confirmations/${emergencyId}`),
  },

  // Hospitals & Capacity
  hospitals: {
    register: (data: any) => request('/hospitals/register', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: () => request('/hospitals/me'),
    updateProfile: (data: any) => request('/hospitals/me', { method: 'PATCH', body: JSON.stringify(data) }),
    getCapacity: () => request('/hospitals/me/capacity'),
    updateCapacity: (data: any) => request('/hospitals/me/capacity', { method: 'PATCH', body: JSON.stringify(data) }),
    getRequests: () => request('/hospitals/requests'),
    getRequestById: (id: string) => request(`/hospitals/requests/${id}`),
    getRequest: (id: string) => request(`/hospitals/requests/${id}`),
    acceptRequest: (id: string, dispatchOptions?: any) =>
      request(`/hospitals/requests/${id}/accept`, { method: 'POST', body: JSON.stringify(dispatchOptions || {}) }),
    rejectRequest: (id: string, reason?: string) =>
      request(`/hospitals/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    markPatientArrived: (id: string) => request(`/hospitals/requests/${id}/arrived`, { method: 'POST' }),
    startTreatment: (id: string) => request(`/hospitals/requests/${id}/treatment`, { method: 'POST' }),
    completeRequest: (id: string) => request(`/hospitals/requests/${id}/complete`, { method: 'POST' }),
    clearRequests: () => request('/hospitals/requests/clear-all', { method: 'POST' }),
    dismissRequest: (id: string) => request(`/hospitals/requests/${id}/dismiss`, { method: 'POST' }),
    matchFacilities: (criteria: any) =>
      request('/hospitals/facilities/match', { method: 'POST', body: JSON.stringify(criteria) }),
    getReferrals: () => request('/hospitals/referrals'),
    createReferral: (requestId: string, data: { referredHospitalId: string; reason: string }) =>
      request(`/hospitals/requests/${requestId}/referral`, { method: 'POST', body: JSON.stringify(data) }),
    getDrivers: () => request('/hospitals/me/drivers'),
    searchDriver: (query: string) =>
      request(`/hospitals/me/drivers/search?query=${encodeURIComponent(query)}`),
    addDriver: (data: any) => request('/hospitals/me/drivers', { method: 'POST', body: JSON.stringify(data) }),
    unlinkDriver: (driverId: string) => request(`/hospitals/me/drivers/${driverId}`, { method: 'DELETE' }),
  },

  // Ambulances & Trips
  ambulances: {
    getTrip: (tripId: string) => request(`/ambulances/trips/${tripId}`),
    createTrip: (assignmentId: string) =>
      request('/ambulances/trips', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
    getTripHistory: () => request('/ambulances/trips/history'),
    // Lifecycle: each step is a POST to dedicated endpoint (matches backend routes)
    startToPatient: (tripId: string) =>
      request(`/ambulances/trips/${tripId}/start-to-patient`, { method: 'POST' }),
    arrivedPatient: (tripId: string) =>
      request(`/ambulances/trips/${tripId}/arrived-patient`, { method: 'POST' }),
    pickup: (tripId: string) =>
      request(`/ambulances/trips/${tripId}/pickup`, { method: 'POST' }),
    startToHospital: (tripId: string) =>
      request(`/ambulances/trips/${tripId}/start-to-hospital`, { method: 'POST' }),
    arrivedHospital: (tripId: string) =>
      request(`/ambulances/trips/${tripId}/arrived-hospital`, { method: 'POST' }),
    completeTrip: (tripId: string) =>
      request(`/ambulances/trips/${tripId}/complete`, { method: 'POST' }),
    // Driver dispatch requests
    getRequests: () => request('/ambulances/requests'),
    getRequest: (id: string) => request(`/ambulances/requests/${id}`),
    acceptRequest: (id: string) =>
      request(`/ambulances/requests/${id}/accept`, { method: 'POST' }),
    dismissRequest: (id: string) =>
      request(`/ambulances/requests/${id}/dismiss`, { method: 'POST' }),
    clearRequests: () =>
      request('/ambulances/requests/clear-all', { method: 'POST' }),
    updateAvailability: (availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE') =>
      request('/ambulances/drivers/me/availability', {
        method: 'PATCH',
        body: JSON.stringify({ availability }),
      }),
  },

  // Location & Proximity
  location: {
    updateLocation: (data: { lat: number; lng: number; accuracy?: number; role?: string }) =>
      request('/location/update', { method: 'POST', body: JSON.stringify(data) }),
    getNearbyHospitals: (lat: number, lng: number, radiusKm = 20) =>
      request(`/location/nearby-hospitals?lat=${lat}&lng=${lng}&radius=${radiusKm}`),
    getNearbyIncidents: (lat: number, lng: number, radiusKm = 10) =>
      request(`/location/nearby-incidents?lat=${lat}&lng=${lng}&radius=${radiusKm}`),
    getRoute: (originLat: number, originLng: number, destLat: number, destLng: number) =>
      request(`/location/route?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`),
  },

  // Doctors & Clinics
  doctors: {
    register: (data: any) => request('/doctors/register', { method: 'POST', body: JSON.stringify(data) }),
    search: (params?: { specialty?: string; userLat?: number; userLng?: number }) => {
      const q = new URLSearchParams();
      if (params?.specialty) q.append('specialty', params.specialty);
      if (params?.userLat !== undefined) q.append('userLat', String(params.userLat));
      if (params?.userLng !== undefined) q.append('userLng', String(params.userLng));
      const qs = q.toString();
      return request(`/doctors${qs ? `?${qs}` : ''}`);
    },
    getMyProfile: () => request('/doctors/me'),
    updateMyProfile: (data: any) => request('/doctors/me', { method: 'PATCH', body: JSON.stringify(data) }),
    getDoctorProfile: (id: string) => request(`/doctors/${id}`),
    verifyDoctor: (id: string, status: string) =>
      request(`/doctors/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getClinic: (id: string) => request(`/doctors/${id}/clinic`),
    getRouteToClinic: (id: string, userLat: number, userLng: number) =>
      request(`/doctors/${id}/route?userLat=${userLat}&userLng=${userLng}`),
  },

  // Appointments & Consultation Lifecycle
  appointments: {
    book: (data: {
      doctorId: string;
      patientId?: string;
      patientName: string;
      date: string;
      timeSlot: string;
      notes?: string;
    }) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    getMyAppointments: () => request('/appointments/my'),
    getById: (id: string) => request(`/appointments/${id}`),
    start: (id: string) => request(`/appointments/${id}/start`, { method: 'POST' }),
    complete: (id: string) => request(`/appointments/${id}/complete`, { method: 'POST' }),
    skip: (id: string) => request(`/appointments/${id}/skip`, { method: 'POST' }),
    cancel: (id: string) => request(`/appointments/${id}/cancel`, { method: 'POST' }),
    getLeaveTime: (id: string, userLat?: number, userLng?: number) => {
      const q = new URLSearchParams();
      if (userLat !== undefined) q.append('userLat', String(userLat));
      if (userLng !== undefined) q.append('userLng', String(userLng));
      const qs = q.toString();
      return request(`/appointments/${id}/leave-time${qs ? `?${qs}` : ''}`);
    },
  },

  // Live Queues
  queues: {
    getLiveQueue: (doctorId: string, token?: number) => {
      const qs = token !== undefined ? `?token=${token}` : '';
      return request(`/queues/${doctorId}${qs}`);
    },
    advanceQueue: (doctorId: string) => request(`/queues/${doctorId}/next`, { method: 'POST' }),
  },

  // Notifications
  notifications: {
    getAll: () => request('/notifications'),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    clearAll: () => request('/notifications/clear-all', { method: 'POST' }),
    registerToken: (token: string, platform = 'expo') =>
      request('/notifications/device-token', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  },

  // AI Assistance
  ai: {
    triage: (data: { symptoms: string[]; consciousness?: string; [key: string]: any }) =>
      request('/ai/triage', { method: 'POST', body: JSON.stringify(data) }),
    imageAnalysis: (data: { imageBase64: string; mimeType: string; context?: string }) =>
      request('/ai/image-analysis', { method: 'POST', body: JSON.stringify(data) }),
    firstAid: (data: { injuryType: string }) =>
      request('/ai/first-aid', { method: 'POST', body: JSON.stringify(data) }),
    validate: (data: any) => request('/ai/validate', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Admin Verification & Applications
  admin: {
    getApplications: (params?: { role?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.role) q.append('role', params.role);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString();
      return request(`/admin/applications${qs ? `?${qs}` : ''}`);
    },
    getPendingDoctors: () => request('/admin/doctors/pending'),
    verifyDoctor: (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) =>
      request(`/admin/doctors/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
    verifyApplication: (role: string, id: string, status: 'APPROVED' | 'REJECTED', notes?: string) =>
      request(`/admin/applications/${role}/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
  },
};

export default api;
