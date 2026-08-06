import { supabase } from './supabase';

type PatientAction =
  | 'check_nik'
  | 'login_patient'
  | 'register_patient'
  | 'get_patient'
  | 'update_patient'
  | 'list_records'
  | 'get_record'
  | 'update_consent'
  | 'approve_staff_access';

type PatientPayload = Record<string, unknown>;

const MAX_RETRIES = 2;
const TIMEOUT_MS = 12000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function callPatientAccess<T>(action: PatientAction, payload: PatientPayload = {}): Promise<T> {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/patient-access`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  };

  const body = JSON.stringify({ action, ...payload });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body,
      }, TIMEOUT_MS);

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.error || `Edge Function error: ${response.status}`;
        throw new Error(errorMessage);
      }

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      return responseData as T;
    } catch (err: any) {
      lastError = err;
      // Don't retry on application-level errors (4xx responses with business logic errors)
      if (err.message && !err.message.includes('abort') && !err.message.includes('network') && !err.message.includes('Failed to send') && !err.message.includes('Network request failed')) {
        throw err;
      }
      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Gagal menghubungi server. Periksa koneksi internet Anda.');
}

