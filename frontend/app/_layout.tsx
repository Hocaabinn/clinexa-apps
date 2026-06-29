import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { Platform } from 'react-native';
import { useAuth } from '../constants/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (Platform.OS === 'web') {
      const inStaffAuth = segments[0] === '(staff-auth)';
      const inStaff = segments[0] === '(staff)';
      if (!isLoggedIn && !inStaffAuth) {
        router.replace('/(staff-auth)/login');
      } else if (isLoggedIn && inStaffAuth) {
        router.replace('/(staff)');
      }
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/screen');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(dashboard)');
    }
  }, [isLoggedIn, segments, isReady]);

  if (!isReady) return null;

  if (Platform.OS === 'web') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(staff-auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(dashboard)" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="(rekam_medis)/index" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="(rekam_medis)/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="(aktivitas)/index" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="(profile)/index" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}

