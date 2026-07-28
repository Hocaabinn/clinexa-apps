import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { supabase } from '../../lib/supabase';

export default function StaffLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Email dan password harus diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setErrorMsg('Email atau password salah.');
      setLoading(false);
      return;
    }

    router.replace('/(staff)');
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('outfit-font')) {
      const style = document.createElement('style');
      style.id = 'outfit-font';
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *:not([style*="Ionicons"]):not([style*="ionicons"]):not(i) { font-family: 'Outfit', sans-serif !important; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <SafeAreaView style={[tw`flex-1 bg-white`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
      <View style={tw`flex-1 bg-[#1ba39a] justify-center px-16 relative`}>
        <View style={tw`absolute top-12 left-16`}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={[{ width: 160, height: 48, marginLeft: -12, objectPosition: 'left' } as any]}
            resizeMode="contain"
          />
        </View>

        <Text style={tw`text-white text-5xl font-medium mb-4 tracking-wide mt-10`}>PORTAL STAF MEDIS</Text>
        <Text style={tw`text-white/80 text-xl leading-relaxed mb-16 max-w-2xl`}>
          Kelola rekam medis elektronik pasien dengan layanan kesehatan secara digital dan terdesentralisasi.
        </Text>

        <View style={tw`flex-row gap-6`}>
          <View style={tw`bg-white/15 p-6 rounded-2xl flex-1`}>
            <Text style={tw`text-white text-2xl font-medium mb-1`}>1,284</Text>
            <Text style={tw`text-white/80 text-sm font-light`}>Pasien Aktif</Text>
          </View>
          <View style={tw`bg-white/15 p-6 rounded-2xl flex-1`}>
            <Text style={tw`text-white text-2xl font-medium mb-1`}>3,901</Text>
            <Text style={tw`text-white/80 text-sm font-light`}>Rekam Medis</Text>
          </View>
          <View style={tw`bg-white/15 p-6 rounded-2xl flex-1`}>
            <Text style={tw`text-white text-2xl font-medium mb-1`}>24</Text>
            <Text style={tw`text-white/80 text-sm font-light`}>Janji Hari Ini</Text>
          </View>
        </View>
      </View>

      <View style={tw`flex-1 bg-[#f4f6f8] justify-center px-24`}>
        <View style={tw`max-w-md w-full mx-auto`}>
          <Text style={tw`text-[#0b4771] text-4xl font-medium mb-2`}>Selamat Datang</Text>
          <Text style={tw`text-[#6d7f95] text-lg mb-10 font-light`}>Masuk ke akun staf medis Anda</Text>

          {errorMsg ? (
            <View style={tw`bg-[#fee2e2] border border-[#fecaca] rounded-xl px-4 py-3 mb-6 flex-row items-center`}>
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text style={tw`text-[#dc2626] ml-2 font-medium`}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={tw`mb-6`}>
            <Text style={tw`text-[#0b4771] font-medium mb-2 uppercase text-sm`}>EMAIL</Text>
            <View style={tw`flex-row items-center border border-[#d8dee8] rounded-xl bg-transparent px-4 h-14`}>
              <Ionicons name="mail-outline" size={20} color="#9aa5b5" />
              <TextInput
                style={tw`flex-1 h-full ml-3 text-[#0b4771] text-base outline-none`}
                placeholder="yourname@domain"
                placeholderTextColor="#9aa5b5"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={tw`mb-2`}>
            <Text style={tw`text-[#0b4771] font-medium mb-2 uppercase text-sm`}>PASSWORD</Text>
            <View style={tw`flex-row items-center border border-[#d8dee8] rounded-xl bg-transparent px-4 h-14`}>
              <Ionicons name="key-outline" size={20} color="#9aa5b5" />
              <TextInput
                style={tw`flex-1 h-full mx-3 text-[#0b4771] text-base outline-none`}
                placeholder="**********"
                placeholderTextColor="#9aa5b5"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9aa5b5" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`flex-row justify-end mb-8`}>
            <TouchableOpacity>
              <Text style={tw`text-[#1ba39a] font-medium text-sm`}>Lupa Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={tw`bg-[#1ba39a] h-14 rounded-xl items-center justify-center flex-row`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-medium text-lg`}>Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
