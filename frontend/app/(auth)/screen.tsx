import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export default function SplashScreen() {
  const router = useRouter();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    // Smooth fade in → hold → fade out
    opacity.value = withSequence(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),  // fade in
      withDelay(1500, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })),  // hold then fade out
    );

    // Gentle scale: 0.6 → 1.0 → slight zoom 1.05 during fade out
    scale.value = withSequence(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.2)) }),  // spring-like scale up
      withDelay(1500, withTiming(1.1, { duration: 600, easing: Easing.in(Easing.cubic) })),  // subtle zoom on exit
    );

    // Navigate after full animation: 1200ms in + 1500ms hold + 600ms out = 3300ms
    const timer = setTimeout(() => {
      router.replace('/(auth)/onboard');
    }, 3400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1BA098',
  },
  logo: {
    width: 160,
    height: 160,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
});
