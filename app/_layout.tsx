import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auction-details" />
        <Stack.Screen name="kyc" />
        <Stack.Screen name="payment-pending" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="my-bids" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms-and-conditions" />
        <Stack.Screen name="return-policy" />
        <Stack.Screen name="refund-policy" />
        <Stack.Screen name="shopping-policy" />
        <Stack.Screen name="help-support" />
        <Stack.Screen name="maintenance" />
        <Stack.Screen name="update-required" />

      </Stack>
      <StatusBar style="light" backgroundColor={colors.primary} translucent={true} />
    </SafeAreaProvider>
  );
}
