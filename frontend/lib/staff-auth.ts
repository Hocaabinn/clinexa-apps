import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './supabase';

interface StaffProfile {
  id: string;
  email: string;
  name: string;
  specialization: string | null;
  registration_number: string | null;
  institution: string | null;
  address: string | null;
  blood_type: string | null;
  nationality: string | null;
}

interface StaffAuthContextType {
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextType>({
  staffProfile: null,
  isAuthenticated: false,
  isLoading: true,
  refreshProfile: async () => {},
});

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}

export { StaffAuthContext };
export type { StaffProfile };

export function useStaffSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAuthenticated, isLoading };
}

export async function fetchStaffProfile(email: string): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return data as StaffProfile;
}

export async function updateStaffProfile(id: string, updates: Partial<StaffProfile>) {
  const { error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id);

  return { error };
}
