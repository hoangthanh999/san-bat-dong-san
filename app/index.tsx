import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
    const [targetRoute, setTargetRoute] = useState<'/(tabs)' | '/(auth)/onboarding' | null>(null);

    useEffect(() => {
        let mounted = true;

        const checkOnboarding = async () => {
            try {
                const done = await AsyncStorage.getItem('onboarding_done');
                if (mounted) {
                    setTargetRoute(done === 'true' ? '/(tabs)' : '/(auth)/onboarding');
                }
            } catch {
                // Onboarding has a skip button and does not require login, so it is the safer fallback.
                if (mounted) {
                    setTargetRoute('/(auth)/onboarding');
                }
            }
        };

        checkOnboarding();

        return () => {
            mounted = false;
        };
    }, []);

    if (!targetRoute) return null;

    return <Redirect href={targetRoute} />;
}
