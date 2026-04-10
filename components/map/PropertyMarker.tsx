import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Room } from '../../types';

interface PropertyMarkerProps {
    item: Room;
    onPress: () => void;
    isSelected: boolean;
}

export default function PropertyMarker({ item, onPress, isSelected }: PropertyMarkerProps) {
    const formatPrice = (price: number) => {
        if (price >= 1000000000) {
            return `${(price / 1000000000).toFixed(1)} tỷ`;
        }
        return `${(price / 1000000).toFixed(0)} tr`;
    };

    return (
        <Marker
            coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
            }}
            onPress={onPress}
            tracksViewChanges={false} // Optimization
        >
            <View style={[
                styles.bubble,
                isSelected && styles.selectedBubble
            ]}>
                <Text style={[
                    styles.price,
                    isSelected && styles.selectedPrice
                ]}>
                    {formatPrice(item.price)}
                </Text>
                {isSelected && <View style={styles.arrow} />}
            </View>
        </Marker>
    );
}

const styles = StyleSheet.create({
    bubble: {
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#0066FF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
    },
    selectedBubble: {
        backgroundColor: '#0066FF',
        transform: [{ scale: 1.1 }],
        zIndex: 10,
    },
    price: {
        color: '#0066FF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    selectedPrice: {
        color: 'white',
    },
    arrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#0066FF',
        position: 'absolute',
        bottom: -6,
    },
});
