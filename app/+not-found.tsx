import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <Ionicons name="alert-circle-outline" size={80} color="#CCC" />
            <Text style={styles.title}>Trang không tồn tại</Text>
            <Text style={styles.subtitle}>Đường dẫn bạn truy cập không có trong ứng dụng.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
                <Ionicons name="home-outline" size={18} color="white" />
                <Text style={styles.buttonText}>Về trang chủ</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 24,
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0066FF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
    },
    buttonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});
