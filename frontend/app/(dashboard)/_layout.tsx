import { Stack } from 'expo-router';

export default function DashboardLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="test-notification" options={{ headerShown: true, title: 'Uji Coba Notifikasi' }} />
        </Stack>
    );
}