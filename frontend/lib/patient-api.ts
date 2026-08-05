import { supabase } from './supabase';

type PatientAction =
  | 'check_nik'
  | 'login_patient'
  | 'register_patient'
  | 'get_patient'
  | 'update_patient'
  | 'list_records'
  | 'get_record'
  | 'update_consent';

type PatientPayload = Record<string, unknown>;

export async function callPatientAccess<T>(action: PatientAction, payload: PatientPayload = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('patient-access', {
    body: { action, ...payload },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}
