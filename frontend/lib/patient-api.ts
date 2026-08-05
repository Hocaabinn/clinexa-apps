import { FunctionsHttpError } from '@supabase/supabase-js';
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
    // Attempt to extract the actual error body returned by the Deno Edge Function
    let customMessage: string | null = null;
    const errObj = error as any;
    if (errObj && errObj.context && typeof errObj.context.json === 'function') {
      try {
        const body = await errObj.context.json();
        if (body && body.error) {
          customMessage = body.error;
        }
      } catch (e) {
        // Fallback if parsing fails
      }
    }
    if (customMessage) {
      throw new Error(customMessage);
    }
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}
