import React, { useEffect } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing
} from 'react-native-reanimated';

interface SkeletonProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
}

export function Skeleton({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
    ...props
}: SkeletonProps) {
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1000, easing: Easing.ease }),
                withTiming(0.5, { duration: 1000, easing: Easing.ease })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    backgroundColor: '#E0E0E0', // Light gray background
                },
                animatedStyle,
                style,
            ]}
            {...props}
        />
    );
}
