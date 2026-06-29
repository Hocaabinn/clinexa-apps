import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function OnboardScreen() {
    const router = useRouter();

    // Animation refs
    const imageOpacity = useRef(new Animated.Value(0)).current;
    const imageScale = useRef(new Animated.Value(0.8)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(30)).current;
    const buttonsOpacity = useRef(new Animated.Value(0)).current;
    const buttonsTranslateY = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        // Staggered entrance animation
        Animated.sequence([
            // 1. Image fades in + scales up
            Animated.parallel([
                Animated.timing(imageOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(imageScale, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Text slides up + fades in
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            // 3. Buttons slide up + fade in
            Animated.parallel([
                Animated.timing(buttonsOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonsTranslateY, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Onboarding illustration */}
                <Animated.View style={[
                    styles.illustrationContainer,
                    {
                        opacity: imageOpacity,
                        transform: [{ scale: imageScale }],
                    },
                ]}>
                    <Image
                        source={require('../../assets/images/onboard.png')}
                        style={styles.onboardImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Animated.View style={[
                    styles.textContainer,
                    {
                        opacity: textOpacity,
                        transform: [{ translateY: textTranslateY }],
                    },
                ]}>
                    <Text style={styles.title}>Clinexa</Text>
                    <Text style={styles.subtitle}>
                        Privasi untuk rekam medis digital yang aman dan terkontrol.
                    </Text>
                </Animated.View>

                <Animated.View style={[
                    styles.buttonContainer,
                    {
                        opacity: buttonsOpacity,
                        transform: [{ translateY: buttonsTranslateY }],
                    },
                ]}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/(auth)/register')}
                    >
                        <Text style={styles.primaryButtonText}>Buat akun</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/(auth)/login')}
                    >
                        <Text style={styles.secondaryButtonText}>Sudah punya akun</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    illustrationContainer: {
        width: width * 0.75,
        height: height * 0.38,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    onboardImage: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1BA098',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#1BA098',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        shadowColor: '#1BA098',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    secondaryButtonText: {
        color: '#1BA098',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
