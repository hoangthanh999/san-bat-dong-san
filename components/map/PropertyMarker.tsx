import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Room } from '../../types';

// ✅ Helper: tạo HTML string cho 1 marker Leaflet (dùng trong buildLeafletHtml)
export const buildMarkerHtml = (item: Room, isSelected = false): string => {
    const price = formatPriceStatic(item.price);
    const bg = isSelected ? '#0066FF' : 'white';
    const color = isSelected ? 'white' : '#0066FF';
    const border = isSelected ? '#0044CC' : '#0066FF';
    const scale = isSelected ? 'scale(1.15)' : 'scale(1)';
    const arrow = isSelected
        ? `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #0066FF;position:absolute;bottom:-6px;left:50%;transform:translateX(-50%)"></div>`
        : '';
    return `
        <div style="
            background:${bg};
            color:${color};
            border:1.5px solid ${border};
            padding:4px 8px;
            border-radius:12px;
            font-size:12px;
            font-weight:bold;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.2);
            transform:${scale};
            position:relative;
            cursor:pointer;
        ">${price}${arrow}</div>
    `;
};

const formatPriceStatic = (price: number): string => {
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    return `${(price / 1_000_000).toFixed(0)} tr`;
};

// ✅ Component React Native dùng để hiển thị marker dạng badge (ngoài map, VD: list)
interface PropertyMarkerProps {
    item: Room;
    onPress: () => void;
    isSelected: boolean;
}

export default function PropertyMarker({ item, onPress, isSelected }: PropertyMarkerProps) {
    const formatPrice = (price: number) => {
        if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
        return `${(price / 1_000_000).toFixed(0)} tr`;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.bubble, isSelected && styles.selectedBubble]}
            activeOpacity={0.8}
        >
            <Text style={[styles.price, isSelected && styles.selectedPrice]}>
                {formatPrice(item.price)}
            </Text>
            {isSelected && <View style={styles.arrow} />}
        </TouchableOpacity>
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