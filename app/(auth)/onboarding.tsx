import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions,
    StatusBar, Platform, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const STEPS = [
    {
        id: 'purpose',
        question: 'Bạn đang tìm kiếm gì?',
        subtitle: 'Chúng tôi sẽ gợi ý bất động sản phù hợp nhất',
        icon: '🏠',
        options: [
            { value: 'BUY', label: 'Mua nhà', icon: 'home', desc: 'Tìm nhà để mua' },
            { value: 'RENT', label: 'Thuê nhà', icon: 'key', desc: 'Tìm phòng trọ / căn hộ' },
            { value: 'INVEST', label: 'Đầu tư', icon: 'trending-up', desc: 'BĐS sinh lời cao' },
        ],
    },
    {
        id: 'budget',
        question: 'Ngân sách của bạn?',
        subtitle: 'Giúp chúng tôi lọc đúng tầm giá',
        icon: '💰',
        options: [
            { value: '<1ty', label: 'Dưới 1 tỷ', icon: 'wallet', desc: '< 1.000.000.000 đ' },
            { value: '1-3ty', label: '1 - 3 tỷ', icon: 'cash', desc: '1 – 3 tỷ đồng' },
            { value: '3-5ty', label: '3 - 5 tỷ', icon: 'card', desc: '3 – 5 tỷ đồng' },
            { value: '>5ty', label: 'Trên 5 tỷ', icon: 'diamond', desc: '> 5.000.000.000 đ' },
        ],
    },
    {
        id: 'location',
        question: 'Khu vực ưa thích?',
        subtitle: 'Chọn một hoặc nhiều khu vực',
        icon: '📍',
        options: [
            { value: 'Q1', label: 'Quận 1', icon: 'business', desc: 'Trung tâm, sầm uất' },
            { value: 'Q7', label: 'Quận 7', icon: 'leaf', desc: 'Phú Mỹ Hưng, yên tĩnh' },
            { value: 'thu_duc', label: 'Thủ Đức', icon: 'school', desc: 'Gần ĐH, sôi động' },
            { value: 'binh_thanh', label: 'Bình Thạnh', icon: 'water', desc: 'Ven sông, hiện đại' },
        ],
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const progressAnim = useRef(new Animated.Value(0)).current;

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const selectedForStep = answers[step.id] || [];

    const animateProgress = (toValue: number) => {
        Animated.spring(progressAnim, {
            toValue,
            useNativeDriver: false,
            tension: 80,
            friction: 10,
        }).start();
    };

    const handleSelect = (value: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const current = answers[step.id] || [];
        const isMulti = step.id === 'location';
        if (isMulti) {
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            setAnswers(prev => ({ ...prev, [step.id]: updated }));
        } else {
            setAnswers(prev => ({ ...prev, [step.id]: [value] }));
        }
    };

    const handleNext = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (isLastStep) {
            await finishOnboarding();
        } else {
            const next = currentStep + 1;
            setCurrentStep(next);
            animateProgress(next / (STEPS.length - 1));
        }
    };

    const finishOnboarding = async () => {
        try {
            await AsyncStorage.setItem('onboarding_done', 'true');
            await AsyncStorage.setItem('onboarding_answers', JSON.stringify(answers));
        } catch (e) { }
        router.replace('/(tabs)');
    };

    const canProceed = selectedForStep.length > 0;

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.progressBar}>
                    {STEPS.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.progressDot,
                                idx <= currentStep && styles.progressDotActive,
                            ]}
                        />
                    ))}
                </View>
                <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Bỏ qua</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.emoji}>{step.icon}</Text>
                <Text style={styles.question}>{step.question}</Text>
                <Text style={styles.subtitle}>{step.subtitle}</Text>

                <View style={styles.optionsGrid}>
                    {step.options.map(option => {
                        const isSelected = selectedForStep.includes(option.value);
                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                onPress={() => handleSelect(option.value)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                                    <Ionicons
                                        name={option.icon as any}
                                        size={24}
                                        color={isSelected ? 'white' : '#0066FF'}
                                    />
                                </View>
                                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                    {option.label}
                                </Text>
                                <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>
                                    {option.desc}
                                </Text>
                                {isSelected && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark" size={12} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Bottom */}
            <View style={styles.footer}>
                <Text style={styles.stepIndicator}>
                    {currentStep + 1} / {STEPS.length}
                </Text>
                <TouchableOpacity
                    style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
                    onPress={canProceed ? handleNext : undefined}
                    activeOpacity={canProceed ? 0.8 : 1}
                >
                    <Text style={styles.nextBtnText}>
                        {isLastStep ? 'Bắt đầu khám phá! 🚀' : 'Tiếp theo'}
                    </Text>
                    {!isLastStep && <Ionicons name="arrow-forward" size={18} color="white" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
    },
    progressBar: {
        flexDirection: 'row',
        gap: 8,
    },
    progressDot: {
        width: 32,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    progressDotActive: {
        backgroundColor: '#0066FF',
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    skipText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    emoji: {
        fontSize: 52,
        marginBottom: 16,
    },
    question: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 8,
        lineHeight: 36,
    },
    subtitle: {
        fontSize: 15,
        color: '#888',
        marginBottom: 28,
        lineHeight: 22,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionCard: {
        width: (width - 52) / 2,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E0E8FF',
        position: 'relative',
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    optionCardSelected: {
        borderColor: '#0066FF',
        backgroundColor: '#EFF4FF',
        shadowOpacity: 0.15,
    },
    optionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#EFF4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionIconSelected: {
        backgroundColor: '#0066FF',
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: '#0066FF',
    },
    optionDesc: {
        fontSize: 12,
        color: '#999',
        lineHeight: 16,
    },
    optionDescSelected: {
        color: '#4D94FF',
    },
    checkmark: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0066FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    stepIndicator: {
        fontSize: 14,
        color: '#999',
        fontWeight: '600',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0066FF',
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 14,
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    nextBtnDisabled: {
        backgroundColor: '#C0D0F0',
        shadowOpacity: 0,
        elevation: 0,
    },
    nextBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
});
