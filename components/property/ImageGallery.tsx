import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    Modal,
    StatusBar,
    Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ImageGalleryProps {
    images: string[];
    initialIndex?: number;
    compact?: boolean; // For inline use in detail screen
    onPress?: (index: number) => void;
}

export function ImageGallery({ images, initialIndex = 0, compact = false, onPress }: ImageGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [fullscreenVisible, setFullscreenVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const handleScroll = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(index);
    };

    const openFullscreen = (index: number) => {
        if (onPress) { onPress(index); return; }
        setActiveIndex(index);
        setFullscreenVisible(true);
    };

    const imageHeight = compact ? 280 : height * 0.45;

    return (
        <>
            <View style={{ height: imageHeight }}>
                <FlatList
                    ref={flatListRef}
                    data={images}
                    keyExtractor={(_, i) => i.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            activeOpacity={0.95}
                            onPress={() => openFullscreen(index)}
                            style={{ width, height: imageHeight }}
                        >
                            <Image
                                source={{ uri: item }}
                                style={{ width, height: imageHeight }}
                                contentFit="cover"
                            />
                        </TouchableOpacity>
                    )}
                />

                {/* Pagination dots */}
                {images.length > 1 && (
                    <View style={styles.dotsContainer}>
                        {images.map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, i === activeIndex && styles.dotActive]}
                            />
                        ))}
                    </View>
                )}

                {/* Counter badge */}
                <View style={styles.counterBadge}>
                    <Text style={styles.counterText}>{activeIndex + 1}/{images.length}</Text>
                </View>
            </View>

            {/* Fullscreen Modal */}
            <Modal
                visible={fullscreenVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFullscreenVisible(false)}
            >
                <StatusBar hidden />
                <View style={styles.fullscreenBackground}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setFullscreenVisible(false)}
                    >
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>

                    <FlatList
                        data={images}
                        keyExtractor={(_, i) => i.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={activeIndex}
                        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                        onMomentumScrollEnd={handleScroll}
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: item }}
                                style={{ width, height: '100%' }}
                                contentFit="contain"
                            />
                        )}
                    />

                    <View style={styles.fullscreenCounter}>
                        <Text style={styles.counterText}>{activeIndex + 1}/{images.length}</Text>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    dotsContainer: {
        position: 'absolute',
        bottom: 12,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
        backgroundColor: 'white',
        width: 18,
    },
    counterBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    counterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    fullscreenBackground: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenCounter: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
});
