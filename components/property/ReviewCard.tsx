import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { OwnerReviewResponse } from '../../types';

interface ReviewCardProps {
    review: OwnerReviewResponse;
    /** true nếu người xem là chủ nhà (owner) → hiện nút Phản hồi */
    isOwner?: boolean;
    onReply?: (reviewId: number, replyText: string) => void;
}

export function ReviewCard({ review, isOwner, onReply }: ReviewCardProps) {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleSendReply = () => {
        if (replyText.trim()) {
            onReply?.(review.id, replyText.trim());
            setShowReplyInput(false);
            setReplyText('');
        }
    };

    // Backend không trả tên/avatar reviewer → fallback an toàn
    const reviewerName = 'Người dùng';
    const reviewerAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=0066FF&color=fff`;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: reviewerAvatarUrl }}
                    style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{reviewerName}</Text>
                        {review.verified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                                <Text style={styles.verifiedText}>Đã xác minh</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
                </View>
            </View>

            {/* Star Rating */}
            <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= review.rating ? '#FFB800' : '#CCC'}
                    />
                ))}
            </View>

            <Text style={styles.comment}>{review.comment}</Text>

            {/* Review Images — field đúng backend: images (không phải reviewImages) */}
            {review.images && review.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {review.images.map((img, index) => (
                        <TouchableOpacity key={index} onPress={() => setFullScreenImage(img)} activeOpacity={0.8}>
                            <Image source={{ uri: img }} style={styles.reviewImage} contentFit="cover" />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Reply from owner — field đúng backend: ownerReply (không phải landlordReply) */}
            {review.ownerReply && (
                <View style={styles.replyBox}>
                    <View style={styles.replyHeader}>
                        <Ionicons name="arrow-redo" size={14} color="#0066FF" />
                        <Text style={styles.replyLabel}>Phản hồi từ chủ nhà</Text>
                        {review.ownerReplyAt && (
                            <Text style={styles.replyDate}> · {formatDate(review.ownerReplyAt)}</Text>
                        )}
                    </View>
                    <Text style={styles.replyText}>{review.ownerReply}</Text>
                </View>
            )}

            {/* Reply button — chỉ hiện cho owner chưa reply */}
            {isOwner && !review.ownerReply && (
                <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => setShowReplyInput(!showReplyInput)}
                >
                    <Ionicons name="chatbubble-outline" size={14} color="#0066FF" />
                    <Text style={styles.replyButtonText}>Phản hồi</Text>
                </TouchableOpacity>
            )}

            {showReplyInput && (
                <View style={styles.replyInputContainer}>
                    <TextInput
                        style={styles.replyInput}
                        placeholder="Nhập phản hồi..."
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendReplyBtn} onPress={handleSendReply}>
                        <Text style={styles.sendReplyText}>Gửi</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Full screen image modal */}
            <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
                <View style={styles.fullScreenOverlay}>
                    <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    {fullScreenImage && (
                        <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} contentFit="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F0F0F0',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    verifiedText: {
        fontSize: 11,
        color: '#22C55E',
        fontWeight: '500',
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginTop: 1,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 8,
    },
    comment: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
    imageScroll: {
        marginTop: 10,
    },
    reviewImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: '#F0F0F0',
    },
    replyBox: {
        backgroundColor: '#F0F5FF',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#0066FF',
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    replyLabel: {
        fontSize: 12,
        color: '#0066FF',
        fontWeight: '600',
    },
    replyDate: {
        fontSize: 11,
        color: '#999',
    },
    replyText: {
        fontSize: 13,
        color: '#444',
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    replyButtonText: {
        fontSize: 13,
        color: '#0066FF',
    },
    replyInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
    replyInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        maxHeight: 80,
    },
    sendReplyBtn: {
        backgroundColor: '#0066FF',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    sendReplyText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    fullScreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
    },
});
