import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type Patient = {
  id: string;
  nik: string;
  name: string;
  gender?: string;
  birth_date?: string;
  blood_type?: string;
  wallet_address?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeNik(nik: unknown) {
  return String(nik ?? '').trim();
}

function assertNik(nik: string) {
  if (!/^\d{16}$/.test(nik)) {
    throw new Error('NIK harus terdiri dari 16 digit angka.');
  }
}

function assertWallet(patient: Patient, walletAddress?: string) {
  if (!patient.wallet_address) return;
  if (!walletAddress || patient.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Recovery phrase tidak cocok dengan wallet pasien.');
  }
}

async function findPatientByNik(nik: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, nik, name, gender, birth_date, blood_type, wallet_address')
    .eq('nik', nik)
    .maybeSingle();

  if (error) throw error;
  return data as Patient | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const action = String(body.action ?? '');
    const nik = normalizeNik(body.nik);

    if (['check_nik', 'login_patient', 'register_patient', 'get_patient', 'list_records', 'get_record', 'update_consent'].includes(action)) {
      assertNik(nik);
    }

    if (action === 'check_nik') {
      const patient = await findPatientByNik(nik);
      return json({ exists: Boolean(patient) });
    }

    if (action === 'login_patient') {
      const patient = await findPatientByNik(nik);
      if (!patient) return json({ error: 'NIK tidak ditemukan atau tidak terdaftar sebagai pasien.' }, 404);

      if (body.wallet_address) {
        assertWallet(patient, String(body.wallet_address));
      }

      return json({
        id: patient.id,
        name: patient.name,
        wallet_address: patient.wallet_address,
      });
    }

    if (action === 'register_patient') {
      const existingPatient = await findPatientByNik(nik);
      if (existingPatient) return json({ error: 'NIK ini sudah terdaftar sebelumnya.' }, 409);

      const { data, error } = await supabase
        .from('patients')
        .insert({
          nik,
          name: String(body.name ?? '').trim(),
          gender: body.gender,
          birth_date: body.birth_date,
          blood_type: body.blood_type ?? 'O',
          wallet_address: body.wallet_address,
        })
        .select('id, name, gender, birth_date, blood_type, wallet_address')
        .single();

      if (error) throw error;
      return json({ patient: data });
    }

    if (action === 'get_patient') {
      const patient = await findPatientByNik(nik);
      if (!patient) return json({ error: 'Data pasien tidak ditemukan.' }, 404);
      assertWallet(patient, body.wallet_address ? String(body.wallet_address) : undefined);

      return json({
        id: patient.id,
        name: patient.name,
        gender: patient.gender,
        birth_date: patient.birth_date,
        blood_type: patient.blood_type,
        wallet_address: patient.wallet_address,
      });
    }

    if (action === 'update_patient') {
      const patientId = String(body.patient_id ?? '');
      if (!patientId) throw new Error('Patient ID wajib diisi.');

      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('id, nik, name, wallet_address')
        .eq('id', patientId)
        .single();
      if (fetchError) throw fetchError;
      assertWallet(patient as Patient, body.wallet_address ? String(body.wallet_address) : undefined);

      const { data, error } = await supabase
        .from('patients')
        .update({
          name: String(body.name ?? '').trim(),
          gender: body.gender,
          birth_date: body.birth_date,
          blood_type: body.blood_type,
        })
        .eq('id', patientId)
        .select('id, name, gender, birth_date, blood_type')
        .single();

      if (error) throw error;
      return json({ patient: data });
    }

    if (action === 'list_records') {
      const patient = await findPatientByNik(nik);
      if (!patient) return json({ error: 'Data pasien tidak ditemukan.' }, 404);
      assertWallet(patient, body.wallet_address ? String(body.wallet_address) : undefined);

      const { data, error } = await supabase
        .from('medical_records')
        .select('*, staff:staff_id(name, institution, specialization)')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return json({ patient: { id: patient.id, name: patient.name }, records: data ?? [] });
    }

    if (action === 'get_record') {
      const patient = await findPatientByNik(nik);
      if (!patient) return json({ error: 'Data pasien tidak ditemukan.' }, 404);
      assertWallet(patient, body.wallet_address ? String(body.wallet_address) : undefined);

      const recordId = String(body.record_id ?? '');
      if (!recordId) throw new Error('Record ID wajib diisi.');

      const { data, error } = await supabase
        .from('medical_records')
        .select('*, staff:staff_id(name, institution, specialization)')
        .eq('id', recordId)
        .eq('patient_id', patient.id)
        .single();

      if (error) throw error;
      return json({ patient: { id: patient.id, name: patient.name }, record: data });
    }

    if (action === 'update_consent') {
      const patient = await findPatientByNik(nik);
      if (!patient) return json({ error: 'Data pasien tidak ditemukan.' }, 404);
      assertWallet(patient, body.wallet_address ? String(body.wallet_address) : undefined);

      const recordId = String(body.record_id ?? '');
      const consentStatus = String(body.consent_status ?? '');
      if (!recordId || !['granted', 'denied', 'pending'].includes(consentStatus)) {
        throw new Error('Record ID dan Status Persetujuan valid wajib diisi.');
      }

      const { data, error } = await supabase
        .from('medical_records')
        .update({ consent_status: consentStatus })
        .eq('id', recordId)
        .eq('patient_id', patient.id)
        .select('*, staff:staff_id(name, institution, specialization)');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Rekam medis tidak ditemukan atau tidak cocok dengan data pasien.');
      }
      return json({ record: data[0] });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error: any) {
    const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return json({ error: msg || 'Unexpected error' }, 400);
  }
});
