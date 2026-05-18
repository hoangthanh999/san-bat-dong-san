import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { billService, BillCreateDTO } from '../../services/api/bills';

type FormState = Record<keyof BillCreateDTO, string>;

const now = new Date();
const initialForm: FormState = {
    contractId: '',
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    electricNew: '',
    waterNew: '',
    electricPrice: '',
    waterPrice: '',
    monthlyRent: '',
    serviceFees: '0',
};

function toNumber(value: string) {
    return Number(value.replace(/\D/g, '')) || 0;
}

export default function CreateBillScreen() {
    return (
        <AuthGuardScreen message="Đăng nhập để tạo hóa đơn tiền trọ" icon="receipt-outline">
            <CreateBillContent />
        </AuthGuardScreen>
    );
}

function CreateBillContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [form, setForm] = useState<FormState>(initialForm);
    const [loading, setLoading] = useState(false);

    const update = (key: keyof BillCreateDTO, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const submit = async () => {
        const payload: BillCreateDTO = {
            contractId: toNumber(form.contractId),
            month: toNumber(form.month),
            year: toNumber(form.year),
            electricNew: toNumber(form.electricNew),
            waterNew: toNumber(form.waterNew),
            electricPrice: toNumber(form.electricPrice),
            waterPrice: toNumber(form.waterPrice),
            monthlyRent: toNumber(form.monthlyRent),
            serviceFees: toNumber(form.serviceFees),
        };

        if (!payload.contractId || payload.month < 1 || payload.month > 12 || !payload.year) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập đúng hợp đồng, tháng và năm.');
            return;
        }
        if (!payload.monthlyRent) {
            Alert.alert('Thiếu tiền thuê', 'Vui lòng nhập tiền thuê tháng.');
            return;
        }

        setLoading(true);
        try {
            const bill = await billService.createBill(payload);
            Alert.alert(
                'Đã tạo hóa đơn',
                `Mã hóa đơn #${bill.id}\nTổng tiền: ${Number(bill.totalAmount || 0).toLocaleString('vi-VN')}đ\nTrạng thái: ${bill.status}`,
                [{ text: 'Xong', onPress: () => router.back() }]
            );
        } catch (err: any) {
            Alert.alert('Không thể tạo hóa đơn', err?.message || 'Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={23} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo hóa đơn tiền trọ</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin kỳ thanh toán</Text>
                    <Field label="Mã hợp đồng" value={form.contractId} onChangeText={v => update('contractId', v)} />
                    <View style={styles.row}>
                        <Field label="Tháng" value={form.month} onChangeText={v => update('month', v)} style={styles.rowField} />
                        <Field label="Năm" value={form.year} onChangeText={v => update('year', v)} style={styles.rowField} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chỉ số sử dụng</Text>
                    <View style={styles.row}>
                        <Field label="Điện mới" value={form.electricNew} onChangeText={v => update('electricNew', v)} style={styles.rowField} />
                        <Field label="Nước mới" value={form.waterNew} onChangeText={v => update('waterNew', v)} style={styles.rowField} />
                    </View>
                    <View style={styles.row}>
                        <Field label="Giá điện" value={form.electricPrice} onChangeText={v => update('electricPrice', v)} style={styles.rowField} />
                        <Field label="Giá nước" value={form.waterPrice} onChangeText={v => update('waterPrice', v)} style={styles.rowField} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Khoản thu</Text>
                    <Field label="Tiền thuê tháng" value={form.monthlyRent} onChangeText={v => update('monthlyRent', v)} />
                    <Field label="Phí dịch vụ" value={form.serviceFees} onChangeText={v => update('serviceFees', v)} />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading} activeOpacity={0.85}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Tạo hóa đơn</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Field({ label, value, onChangeText, style }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    style?: object;
}) {
    return (
        <View style={[styles.field, style]}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
    row: { flexDirection: 'row', gap: 10 },
    rowField: { flex: 1 },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: '700', color: '#555' },
    input: { height: 46, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#1A1A1A', backgroundColor: '#fff' },
    primaryBtn: { backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
