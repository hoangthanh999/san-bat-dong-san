import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ScrollView,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '../../hooks/useSafeRouter';

const { width } = Dimensions.get('window');

type OnboardingStep = {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    answerKey?: 'purpose' | 'discovery';
    required?: boolean;
    options?: {
        value: string;
        label: string;
        icon: keyof typeof Ionicons.glyphMap;
        desc: string;
    }[];
};

const STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        title: 'Chào mừng đến với HomeVerse',
        subtitle: 'Tìm bất động sản, xem bản đồ, chat với chủ nhà và đặt lịch xem nhà ngay trên điện thoại.',
        icon: '🏠',
    },
    {
        id: 'purpose',
        answerKey: 'purpose',
        required: true,
        title: 'Bạn đang quan tâm đến gì?',
        subtitle: 'Lưu lựa chọn ban đầu để app hiểu nhu cầu của bạn hơn. Bạn vẫn có thể thay đổi bằng Search/filter.',
        icon: '🔎',
        options: [
            { value: 'RENT', label: 'Thuê nhà/phòng', icon: 'key-outline', desc: 'Tìm phòng trọ, căn hộ hoặc nhà cho thuê' },
            { value: 'BUY', label: 'Mua nhà', icon: 'home-outline', desc: 'Tìm bất động sản để mua' },
            { value: 'INVEST', label: 'Đầu tư', icon: 'trending-up-outline', desc: 'Quan tâm tài sản có tiềm năng sinh lời' },
            { value: 'UNSURE', label: 'Chưa xác định', icon: 'help-circle-outline', desc: 'Xem trước rồi lọc sau trong app' },
        ],
    },
    {
        id: 'discovery',
        answerKey: 'discovery',
        required: true,
        title: 'Bạn muốn tìm nhà bằng cách nào?',
        subtitle: 'Chọn cách khám phá phù hợp nhất lúc bắt đầu. Các công cụ này đều có sẵn trong app.',
        icon: '🧭',
        options: [
            { value: 'FEED', label: 'Xem Feed đề xuất', icon: 'albums-outline', desc: 'Lướt danh sách tin mới và nổi bật' },
            { value: 'FILTER', label: 'Lọc khu vực/giá', icon: 'options-outline', desc: 'Tìm theo nhu cầu cụ thể hơn' },
            { value: 'MAP', label: 'Xem trên bản đồ', icon: 'map-outline', desc: 'Xem bất động sản theo vị trí' },
            { value: 'AI_CHAT', label: 'Hỏi AI / chat tư vấn', icon: 'chatbubble-ellipses-outline', desc: 'Nhận gợi ý và trao đổi khi cần' },
        ],
    },
    {
        id: 'ready',
        title: 'Sẵn sàng khám phá bất động sản',
        subtitle: 'Bạn có thể xem tin và tìm kiếm ngay. Khi muốn chat, đặt lịch, đăng tin hoặc dùng ví, app sẽ yêu cầu đăng nhập.',
        icon: '✨',
    },
];

export default function OnboardingScreen() {
    const { safeReplace } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const progressAnim = useRef(new Animated.Value(0)).current;

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const selectedForStep = step.answerKey ? answers[step.answerKey] : undefined;
    const canProceed = !step.required || Boolean(selectedForStep);

    const progressWidth = useMemo(
        () =>
            progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
            }),
        [progressAnim]
    );

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
        if (!step.answerKey) return;
        setAnswers(prev => ({ ...prev, [step.answerKey!]: value }));
    };

    const finishOnboarding = async () => {
        try {
            await AsyncStorage.setItem('onboarding_done', 'true');
            if (Object.keys(answers).length > 0) {
                await AsyncStorage.setItem('onboarding_answers', JSON.stringify(answers));
            }
        } catch {
            // Even if storage fails, let the user enter the app; next launch can show onboarding again.
        }
        safeReplace('/(tabs)' as any);
    };

    const handleNext = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (isLastStep) {
            await finishOnboarding();
            return;
        }

        const next = currentStep + 1;
        setCurrentStep(next);
        animateProgress(next / (STEPS.length - 1));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
                <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Bỏ qua</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.emoji}>{step.icon}</Text>
                <Text style={styles.title}>{step.title}</Text>
                <Text style={styles.subtitle}>{step.subtitle}</Text>

                {step.options ? (
                    <View style={styles.optionsGrid}>
                        {step.options.map(option => {
                            const isSelected = selectedForStep === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                    onPress={() => handleSelect(option.value)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                                        <Ionicons
                                            name={option.icon}
                                            size={24}
                                            color={isSelected ? 'white' : '#f96302'}
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
                ) : (
                    <View style={styles.infoCard}>
                        <Ionicons name="phone-portrait-outline" size={26} color="#f96302" />
                        <Text style={styles.infoTitle}>Vào app trước, đăng nhập khi cần</Text>
                        <Text style={styles.infoText}>
                            Bạn có thể xem Feed, Search và Map ngay. Một số chức năng như chat, đặt lịch,
                            đăng tin và ví sẽ yêu cầu đăng nhập.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <Text style={styles.stepIndicator}>
                    {currentStep + 1} / {STEPS.length}
                </Text>
                <TouchableOpacity
                    style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
                    onPress={canProceed ? handleNext : undefined}
                    activeOpacity={canProceed ? 0.85 : 1}
                >
                    <Text style={styles.nextBtnText}>
                        {isLastStep ? 'Bắt đầu khám phá' : 'Tiếp theo'}
                    </Text>
                    {!isLastStep && <Ionicons name="arrow-forward" size={18} color="white" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F6F8' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FED7AA',
        overflow: 'hidden',
        marginRight: 16,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#f96302',
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    skipText: {
        color: '#667085',
        fontSize: 14,
        fontWeight: '600',
    },
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 28,
    },
    emoji: {
        fontSize: 54,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#101828',
        marginBottom: 10,
        lineHeight: 36,
    },
    subtitle: {
        fontSize: 15,
        color: '#667085',
        marginBottom: 24,
        lineHeight: 22,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionCard: {
        width: (width - 52) / 2,
        minHeight: 150,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        borderWidth: 2,
        borderColor: '#FED7AA',
        position: 'relative',
        shadowColor: '#f96302',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    optionCardSelected: {
        borderColor: '#f96302',
        backgroundColor: '#FFF7ED',
        shadowOpacity: 0.15,
    },
    optionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionIconSelected: {
        backgroundColor: '#f96302',
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#101828',
        marginBottom: 5,
    },
    optionLabelSelected: {
        color: '#f96302',
    },
    optionDesc: {
        fontSize: 12,
        color: '#667085',
        lineHeight: 17,
    },
    optionDescSelected: {
        color: '#ea580c',
    },
    checkmark: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#f96302',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#FED7AA',
        shadowColor: '#f96302',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    infoTitle: {
        marginTop: 10,
        fontSize: 17,
        fontWeight: '800',
        color: '#101828',
    },
    infoText: {
        marginTop: 8,
        fontSize: 14,
        color: '#667085',
        lineHeight: 21,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    stepIndicator: {
        fontSize: 14,
        color: '#667085',
        fontWeight: '700',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f96302',
        borderRadius: 14,
        paddingHorizontal: 22,
        paddingVertical: 14,
        shadowColor: '#f96302',
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
        fontWeight: '800',
        fontSize: 15,
    },
});

