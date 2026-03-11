import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'outline' | 'ghost' | 'danger';
    isLoading?: boolean;
    disabled?: boolean;
    style?: any;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    isLoading = false,
    disabled = false,
    style
}: ButtonProps) {
    const getButtonStyle = () => {
        if (disabled) return styles.disabled;
        switch (variant) {
            case 'primary': return styles.primary;
            case 'outline': return styles.outline;
            case 'ghost': return styles.ghost;
            case 'danger': return styles.danger;
            default: return styles.primary;
        }
    };

    const getTextStyle = () => {
        if (disabled) return styles.textDisabled;
        switch (variant) {
            case 'primary': return styles.textPrimary;
            case 'outline': return styles.textOutline;
            case 'ghost': return styles.textGhost;
            case 'danger': return styles.textDanger;
            default: return styles.textPrimary;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button, getButtonStyle(), style]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={variant === 'outline' ? '#0066FF' : 'white'} />
            ) : (
                <Text style={[styles.text, getTextStyle()]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    primary: {
        backgroundColor: '#0066FF',
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#0066FF',
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: '#EF4444',
    },
    disabled: {
        backgroundColor: '#E0E0E0',
        borderColor: '#E0E0E0',
        shadowOpacity: 0,
        elevation: 0,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
    textPrimary: {
        color: 'white',
    },
    textOutline: {
        color: '#0066FF',
    },
    textGhost: {
        color: '#0066FF',
    },
    textDanger: {
        color: 'white',
    },
    textDisabled: {
        color: '#999',
    },
});
