import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface ReviewCardProps {
    review: Review;
    isMyReview?: boolean;
    onReply?: (reviewId: number) => void;
    onDelete?: (reviewId: number) => void;
}

export function ReviewCard({ review, isMyReview, onReply, onDelete }: ReviewCardProps) {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: review.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=0066FF&color=fff` }}
                    style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.userName}>{review.userName}</Text>
                    <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
                </View>
                {isMyReview && (
                    <TouchableOpacity onPress={() => onDelete?.(review.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color="#FF4444" />
                    </TouchableOpacity>
                )}
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

            {/* Reply from landlord */}
            {review.reply && (
                <View style={styles.replyBox}>
                    <View style={styles.replyHeader}>
                        <Ionicons name="arrow-redo" size={14} color="#0066FF" />
                        <Text style={styles.replyLabel}>Phản hồi từ chủ nhà</Text>
                    </View>
                    <Text style={styles.replyText}>{review.reply}</Text>
                </View>
            )}

            {/* Reply button for landlord */}
            {onReply && !review.reply && (
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
                    <TouchableOpacity
                        style={styles.sendReplyBtn}
                        onPress={() => {
                            if (replyText.trim()) {
                                onReply?.(review.id);
                                setShowReplyInput(false);
                                setReplyText('');
                            }
                        }}
                    >
                        <Text style={styles.sendReplyText}>Gửi</Text>
                    </TouchableOpacity>
                </View>
            )}
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
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginTop: 1,
    },
    deleteBtn: {
        padding: 4,
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
});
