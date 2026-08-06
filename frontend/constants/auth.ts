import { useState, useEffect } from 'react';

// Global shared state for simulating login session status
let currentLoginState = false;
const subscribers = new Set<(state: boolean) => void>();

// Global cache for patient data to avoid loading screens during navigation
interface PatientData {
  id: string;
  name: string;
}

let cachedPatientData: PatientData | null = null;
let cachedMedicalRecords: any[] | null = null;

export const patientDataCache = {
  get: () => cachedPatientData,
  set: (data: PatientData | null) => {
    cachedPatientData = data;
  },
  clear: () => {
    cachedPatientData = null;
  }
};

export const medicalRecordsCache = {
  get: () => cachedMedicalRecords,
  set: (data: any[] | null) => {
    cachedMedicalRecords = data;
  },
  clear: () => {
    cachedMedicalRecords = null;
  }
};

export const authState = {
  isLoggedIn: () => currentLoginState,
  login: () => {
    currentLoginState = true;
    subscribers.forEach(cb => cb(true));
  },
  logout: () => {
    currentLoginState = false;
    patientDataCache.clear();
    medicalRecordsCache.clear();
    subscribers.forEach(cb => cb(false));
  },
  subscribe: (cb: (state: boolean) => void) => {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }
};

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(currentLoginState);

  useEffect(() => {
    return authState.subscribe(setLoggedIn);
  }, []);

  return {
    isLoggedIn: loggedIn,
    login: authState.login,
    logout: authState.logout,
  };
}
