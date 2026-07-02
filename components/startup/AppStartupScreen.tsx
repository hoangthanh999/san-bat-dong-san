import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { APP_NAME } from '../../constants';

type AppStartupScreenProps = {
    message?: string;
    subMessage?: string;
};

export function AppStartupScreen({
    message = `Đang khởi động ${APP_NAME}...`,
    subMessage = 'Đang kết nối hệ thống...',
}: AppStartupScreenProps) {
    const pulse = useRef(new Animated.Value(0)).current;
    const bar = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 850,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0,
                    duration: 850,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );

        const barLoop = Animated.loop(
            Animated.timing(bar, {
                toValue: 1,
                duration: 1200,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
            })
        );

        pulseLoop.start();
        barLoop.start();

        return () => {
            pulseLoop.stop();
            barLoop.stop();
        };
    }, [bar, pulse]);

    const logoScale = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.97, 1.04],
    });
    const logoOpacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.88, 1],
    });
    const barTranslateX = bar.interpolate({
        inputRange: [0, 1],
        outputRange: [-96, 224],
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.logoWrap,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ]}
            >
                <Image
                    source={require('../../assets/adaptive-icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>{subMessage}</Text>

            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        { transform: [{ translateX: barTranslateX }] },
                    ]}
                />
            </View>

            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f96302',
        paddingHorizontal: 32,
    },
    logoWrap: {
        width: 116,
        height: 116,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 116,
        height: 116,
    },
    appName: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: 0,
        marginBottom: 10,
    },
    message: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 6,
    },
    subMessage: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
    },
    progressTrack: {
        width: 224,
        height: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.24)',
        overflow: 'hidden',
    },
    progressFill: {
        width: 96,
        height: 4,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
    },
    spinner: {
        marginTop: 22,
    },
});
