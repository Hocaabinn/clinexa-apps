import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

export default function NotFound() {
  if (Platform.OS === 'web') {
    return <Redirect href="/(staff-auth)/login" />;
  }
  return <Redirect href="/(auth)/screen" />;
}
