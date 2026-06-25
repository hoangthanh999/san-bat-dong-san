import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useKYCStore } from '../../store/kycStore';
import { roomService } from '../../services/api/rooms';
import { mediaService } from '../../services/api/media';
import { amenityService } from '../../services/api/amenities';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { projectService } from '../../services/api/projects';
import { PropertyRequestDTO, Amenity, ProjectResponseDTO } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

const STEPS = ['Cơ bản', 'Chi tiết', 'Ảnh & Video', 'Hoàn thành'];
const FURNITURE_OPTIONS = ['Không có', 'Cơ bản', 'Đầy đủ', 'Cao cấp'];
const FURNITURE_MAP: Record<string, string> = {
    'Không có': 'UNFURNISHED',
    'Cơ bản': 'PARTIALLY_FURNISHED',
    'Đầy đủ': 'FULLY_FURNISHED',
    'Cao cấp': 'FULLY_FURNISHED',
};
const FURNITURE_REVERSE_MAP: Record<string, string> = {
    'UNFURNISHED': 'Không có',
    'PARTIALLY_FURNISHED': 'Cơ bản',
    'FULLY_FURNISHED': 'Đầy đủ',
};

const LEGAL_DOCUMENT_OPTIONS = ['Sổ hồng / Sổ đỏ', 'Hợp đồng thuê', 'Giấy ủy quyền', 'Khác'];
const LEGAL_DOCUMENT_MAP: Record<string, string> = {
    'Sổ hồng / Sổ đỏ': 'CERTIFICATE_OF_OWNERSHIP',
    'Hợp đồng thuê': 'LEASE_CONTRACT',
    'Giấy ủy quyền': 'AUTHORIZATION_LETTER',
    'Khác': 'NONE',
};
const LEGAL_DOCUMENT_REVERSE_MAP: Record<string, string> = {
    'NONE': 'Khác',
    'CERTIFICATE_OF_OWNERSHIP': 'Sổ hồng / Sổ đỏ',
    'LEASE_CONTRACT': 'Hợp đồng thuê',
    'AUTHORIZATION_LETTER': 'Giấy ủy quyền',
};

const AVAILABILITY_OPTIONS = ['Vào ở ngay', 'Trong tháng này', 'Trong tháng sau', 'Thương lượng'];
const AVAILABILITY_MAP: Record<string, string> = {
    'Vào ở ngay': 'IMMEDIATELY',
    'Trong tháng này': 'THIS_MONTH',
    'Trong tháng sau': 'NEXT_MONTH',
    'Thương lượng': 'NEGOTIABLE',
};
const AVAILABILITY_REVERSE_MAP: Record<string, string> = {
    'IMMEDIATELY': 'Vào ở ngay',
    'THIS_MONTH': 'Trong tháng này',
    'NEXT_MONTH': 'Trong tháng sau',
    'NEGOTIABLE': 'Thương lượng',
};

const VALIDITY_OPTIONS = ['30 ngày', '60 ngày', '90 ngày'];
const VALIDITY_MAP: Record<string, number> = {
    '30 ngày': 30,
    '60 ngày': 60,
    '90 ngày': 90,
};
const VALIDITY_REVERSE_MAP: Record<number, string> = {
    30: '30 ngày',
    60: '60 ngày',
    90: '90 ngày',
};

const PROPERTY_TYPE_OPTIONS = [
    { val: 'ROOM', label: 'Phòng trọ' },
    { val: 'APARTMENT', label: 'Căn hộ' },
    { val: 'HOUSE', label: 'Nhà' },
];

const TRANSACTION_TYPE_OPTIONS = [
    { val: 'FOR_RENT', label: 'Cho thuê' },
    { val: 'FOR_SALE', label: 'Bán' },
] as const;

const UTILITY_PRICE_OPTIONS = [
    { val: 'FREE', label: 'Miễn phí' },
    { val: 'STATE_PRICE', label: 'Giá nhà nước' },
    { val: 'LANDLORD_PRICE', label: 'Theo quy định chủ nhà' },
    { val: 'SHARED', label: 'Chia đều' },
    { val: 'NEGOTIABLE', label: 'Thỏa thuận' },
] as const;
const UTILITY_PRICE_VALUES = new Set(UTILITY_PRICE_OPTIONS.map(opt => opt.val));
const isValidUtilityPrice = (value: string) => UTILITY_PRICE_VALUES.has(value as any);

const PROVINCES: Record<string, Record<string, string[]>> = {
    'Hồ Chí Minh': {
        'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Cô Giang', 'Phường Đa Kao', 'Phường Nguyễn Cư Trinh', 'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 'Phường Tân Định'],
        'Quận 2 (TP Thủ Đức)': ['Phường An Khánh', 'Phường An Lợi Đông', 'Phường An Phú', 'Phường Bình An', 'Phường Bình Khánh', 'Phường Bình Trưng Đông', 'Phường Bình Trưng Tây', 'Phường Cát Lái', 'Phường Thạnh Mỹ Lợi', 'Phường Thảo Điền', 'Phường Thủ Thiêm'],
        'Quận 3': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 9', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường Võ Thị Sáu'],
        'Quận 7': ['Phường Bình Thuận', 'Phường Phú Mỹ', 'Phường Phú Thuận', 'Phường Tân Hưng', 'Phường Tân Kiểng', 'Phường Tân Phong', 'Phường Tân Phú', 'Phường Tân Quy'],
        'Quận Bình Thạnh': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 17', 'Phường 19', 'Phường 21', 'Phường 22', 'Phường 24', 'Phường 25', 'Phường 27', 'Phường 28'],
        'Quận Gò Vấp': ['Phường 1', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 17'],
        'Quận Tân Bình': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
        'Quận Tân Phú': ['Phường Hiệp Tân', 'Phường Hòa Thạnh', 'Phường Phú Thạnh', 'Phường Phú Thọ Hòa', 'Phường Phú Trung', 'Phường Sơn Kỳ', 'Phường Tân Quý', 'Phường Tân Sơn Nhì', 'Phường Tân Thành', 'Phường Tân Thới Hòa', 'Phường Tây Thạnh'],
        'Quận Phú Nhuận': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 13', 'Phường 15', 'Phường 17'],
    },
    'Hà Nội': {
        'Quận Ba Đình': ['Phường Cống Vị', 'Phường Điện Biên', 'Phường Đội Cấn', 'Phường Giảng Võ', 'Phường Kim Mã', 'Phường Liễu Giai', 'Phường Ngọc Hà', 'Phường Ngọc Khánh', 'Phường Nguyễn Trung Trực', 'Phường Phúc Xá', 'Phường Quán Thánh', 'Phường Thành Công', 'Phường Trúc Bạch', 'Phường Vĩnh Phúc'],
        'Quận Hoàn Kiếm': ['Phường Chương Dương', 'Phường Cửa Đông', 'Phường Cửa Nam', 'Phường Đồng Xuân', 'Phường Hàng Bạc', 'Phường Hàng Bài', 'Phường Hàng Bồ', 'Phường Hàng Buồm', 'Phường Hàng Đào', 'Phường Hàng Gai', 'Phường Hàng Mã', 'Phường Hàng Trống', 'Phường Lý Thái Tổ', 'Phường Phan Chu Trinh', 'Phường Phúc Tân', 'Phường Tràng Tiền', 'Phường Trần Hưng Đạo'],
        'Quận Đống Đa': ['Phường Cát Linh', 'Phường Hàng Bột', 'Phường Khâm Thiên', 'Phường Khương Thượng', 'Phường Kim Liên', 'Phường Láng Hạ', 'Phường Láng Thượng', 'Phường Nam Đồng', 'Phường Ngã Tư Sở', 'Phường Ô Chợ Dừa', 'Phường Phương Liên', 'Phường Phương Mai', 'Phường Quang Trung', 'Phường Quốc Tử Giám', 'Phường Thổ Quan', 'Phường Thịnh Quang', 'Phường Trung Liệt', 'Phường Trung Phụng', 'Phường Trung Tự', 'Phường Văn Chương', 'Phường Văn Miếu'],
        'Quận Cầu Giấy': ['Phường Dịch Vọng', 'Phường Dịch Vọng Hậu', 'Phường Mai Dịch', 'Phường Nghĩa Đô', 'Phường Nghĩa Tân', 'Phường Quan Hoa', 'Phường Trung Hòa', 'Phường Yên Hòa'],
        'Quận Thanh Xuân': ['Phường Hạ Đình', 'Phường Khương Đình', 'Phường Khương Mai', 'Phường Khương Trung', 'Phường Kim Giang', 'Phường Nhân Chính', 'Phường Phương Liệt', 'Phường Thanh Xuân Bắc', 'Phường Thanh Xuân Nam', 'Phường Thanh Xuân Trung', 'Phường Thượng Đình'],
    },
    'Đà Nẵng': {
        'Quận Hải Châu': ['Phường Bình Hiên', 'Phường Bình Thuận', 'Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Hòa Cường Bắc', 'Phường Hòa Cường Nam', 'Phường Hòa Thuận Đông', 'Phường Hòa Thuận Tây', 'Phường Nam Dương', 'Phường Phước Ninh', 'Phường Thạch Thang', 'Phường Thanh Bình', 'Phường Thuận Phước'],
        'Quận Thanh Khê': ['Phường An Khê', 'Phường Chính Gián', 'Phường Hòa Khê', 'Phường Tam Thuận', 'Phường Tân Chính', 'Phường Thạc Gián', 'Phường Thanh Khê Đông', 'Phường Thanh Khê Tây', 'Phường Vĩnh Trung', 'Phường Xuân Hà'],
        'Quận Sơn Trà': ['Phường An Hải Bắc', 'Phường An Hải Đông', 'Phường An Hải Tây', 'Phường Mân Thái', 'Phường Nại Hiên Đông', 'Phường Phước Mỹ', 'Phường Thọ Quang'],
    },
};
// ─── Sub-components ───────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <View style={styles.stepIndicator}>
            {STEPS.map((step, index) => (
                <React.Fragment key={step}>
                    <View style={styles.stepItem}>
                        <View style={[styles.stepCircle, index <= currentStep && styles.stepCircleActive]}>
                            {index < currentStep
                                ? <Ionicons name="checkmark" size={14} color="white" />
                                : <Text style={[styles.stepNum, index === currentStep && styles.stepNumActive]}>{index + 1}</Text>}
                        </View>
                        <Text style={[styles.stepLabel, index === currentStep && styles.stepLabelActive]}>{step}</Text>
                    </View>
                    {index < STEPS.length - 1 && (
                        <View style={[styles.stepLine, index < currentStep && styles.stepLineActive]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
}

function ChipSelector({ options, selected, onToggle }: {
    options: string[]; selected: string[]; onToggle: (val: string) => void;
}) {
    return (
        <View style={styles.chipRow}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selected.includes(opt) && styles.chipSelected]}
                    onPress={() => onToggle(opt)}
                >
                    <Text style={[styles.chipText, selected.includes(opt) && styles.chipTextSelected]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function VideoPreviewPlayer({ uri, onRemove }: { uri: string; onRemove: () => void }) {
    const player = useVideoPlayer(uri, (p: VideoPlayer) => { p.loop = false; p.muted = true; });
    useEffect(() => { return () => { try { player.release(); } catch (_) { } }; }, []);
    return (
        <View style={styles.videoPreviewContainer}>
            <VideoView style={styles.videoPreview} player={player} allowsPictureInPicture={false} contentFit="cover" />
            <TouchableOpacity style={styles.removeVideoBtn} onPress={onRemove}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
            <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={12} color="white" />
                <Text style={styles.videoBadgeText}>Video</Text>
            </View>
        </View>
    );
}

function DropdownPicker({ label, options, value, onChange, placeholder }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <View style={styles.formField}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setIsOpen(!isOpen)}>
                <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>{value || placeholder}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
            </TouchableOpacity>
            {isOpen && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled showsVerticalScrollIndicator>
                    {options.map(opt => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.dropdownItem, opt === value && styles.dropdownItemSelected]}
                            onPress={() => { onChange(opt); setIsOpen(false); }}
                        >
                            <Text style={[styles.dropdownItemText, opt === value && styles.dropdownItemTextSelected]}>{opt}</Text>
                            {opt === value && <Ionicons name="checkmark" size={16} color="#0066FF" />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

function FormField({ label, children, required }: { label: string; children?: React.ReactNode; required?: boolean }) {
    return (
        <View style={styles.formField}>
            <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
            {children}
        </View>
    );
}

function NumberStepper({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
    return (
        <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => value > min && onChange(value - 1)}>
                <Ionicons name="remove" size={20} color={value === min ? '#CCC' : '#0066FF'} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{value}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => value < max && onChange(value + 1)}>
                <Ionicons name="add" size={20} color={value === max ? '#CCC' : '#0066FF'} />
            </TouchableOpacity>
        </View>
    );
}

function OptionButtonGroup<T extends string>({ options, value, onChange }: {
    options: readonly { val: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
    return (
        <View style={styles.toggleRow}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt.val}
                    style={[styles.toggleBtn, value === opt.val && styles.toggleBtnActive]}
                    onPress={() => onChange(opt.val)}
                >
                    <Text style={[styles.toggleText, value === opt.val && styles.toggleTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function UtilityPriceField({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: readonly { val: string; label: string }[];
}) {
    return (
        <FormField label={label}>
            <OptionButtonGroup
                options={options}
                value={value}
                onChange={onChange}
            />
        </FormField>
    );
}

// ─── Main Export ──────────────────────────────────────────────

export default function PostScreen() {
    return (
        <AuthGuardScreen message="Đăng nhập để đăng tin bất động sản" icon="create-outline">
            <PostScreenContent />
        </AuthGuardScreen>
    );
}

// ─── PostScreenContent ────────────────────────────────────────

function PostScreenContent() {
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { isAuthenticated } = useAuthStore();
    const { kycStatus, fetchKYCStatus } = useKYCStore();

    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // ✅ useRef khai báo đúng chỗ - trong function component, KHÔNG trong JSX
    const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [amenityList, setAmenityList] = useState<Amenity[]>([]);
    const [amenityLoading, setAmenityLoading] = useState(false);
    const [amenityError, setAmenityError] = useState<string | null>(null);
    const [projectList, setProjectList] = useState<ProjectResponseDTO[]>([]);
    const [projectLoading, setProjectLoading] = useState(false);

    const [form, setForm] = useState({
        title: '',
        province: '',
        district: '',
        ward: '',
        addressDetail: '',
        price: '',
        area: '',
        transactionType: 'FOR_RENT' as 'FOR_RENT' | 'FOR_SALE',
        propertyType: 'ROOM' as string,
        description: '',
        bedrooms: '1',
        bathrooms: '1',
        capacity: '',
        furnishingStatus: 'PARTIALLY_FURNISHED',
        hasBalcony: false,
        availabilityStatus: 'IMMEDIATELY',
        electricityPrice: 'NEGOTIABLE',
        waterPrice: 'NEGOTIABLE',
        internetPrice: 'NEGOTIABLE',
        amenities: [] as string[],
        latitude: '',   // ✅ Để trống, geocode sẽ fill
        longitude: '',  // ✅ Để trống, geocode sẽ fill
        projectId: '',  // Dự án liên kết (ID dạng string)
        legalDocumentType: '', // Loại giấy tờ pháp lý
        validityDays: '30', // Thời gian hiển thị tin đăng
    });

    useEffect(() => {
        if (isAuthenticated) fetchKYCStatus();
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchAmenities = async () => {
            setAmenityLoading(true);
            setAmenityError(null);
            try {
                const data = await amenityService.getAll();
                if (__DEV__) {
                    console.log('[Post] amenities loaded:', data);
                }
                setAmenityList(data);
            } catch (err) {
                console.warn('[Post] Failed to fetch amenities:', err);
                setAmenityError('Không tải được danh sách tiện ích');
                setAmenityList([]);
            } finally {
                setAmenityLoading(false);
            }
        };
        fetchAmenities();
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            setProjectLoading(true);
            try {
                const data = await projectService.getPublicProjects(0, 100);
                setProjectList(data?.content || []);
            } catch (err) {
                console.warn('[Post] Failed to fetch projects:', err);
            } finally {
                setProjectLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // ✅ Cleanup timer khi unmount
    useEffect(() => {
        return () => {
            if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        };
    }, []);

    const updateForm = (key: keyof typeof form, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    // ✅ Geocode địa chỉ → tọa độ thực tế qua Nominatim (OpenStreetMap, miễn phí)
    const geocodeAddress = async (province: string, district: string, ward: string, detail: string) => {
        if (!province || !district) return;
        setIsGeocoding(true);

        // Thử lần lượt từ chi tiết → tổng quát
        const queries = [
            // Lần 1: Đầy đủ nhất (số nhà + đường + phường + quận + tỉnh)
            [detail, ward, district, province].filter(Boolean),
            // Lần 2: Bỏ số nhà (đường + phường + quận + tỉnh)
            [ward, district, province].filter(Boolean),
            // Lần 3: Chỉ quận + tỉnh (fallback an toàn nhất)
            [district, province].filter(Boolean),
        ];

        try {
            for (const parts of queries) {
                if (parts.length < 2) continue;
                const query = encodeURIComponent(parts.join(', ') + ', Việt Nam');
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=vn`,
                    { headers: { 'Accept-Language': 'vi', 'User-Agent': 'SmartRental/1.0' } }
                );
                const data = await res.json();
                if (data && data.length > 0) {
                    setForm(prev => ({ ...prev, latitude: data[0].lat, longitude: data[0].lon }));
                    if (__DEV__) {
                        console.log(`[Geocode] ✅ Match: "${parts.join(', ')}" → ${data[0].lat}, ${data[0].lon}`);
                    }
                    return; // Dừng ngay khi có kết quả
                }
                console.warn(`[Geocode] ❌ No result for: "${parts.join(', ')}"`);
            }
            console.warn('[Geocode] Không tìm được tọa độ nào.');
        } catch (err) {
            console.warn('[Geocode] Failed:', err);
        } finally {
            setIsGeocoding(false);
        }
    };


    const toggleAmenity = (name: string) => {
        updateForm(
            'amenities',
            form.amenities.includes(name)
                ? form.amenities.filter(a => a !== name)
                : [...form.amenities, name]
        );
    };

    const districtOptions = form.province ? Object.keys(PROVINCES[form.province] || {}) : [];
    const wardOptions = form.province && form.district ? (PROVINCES[form.province]?.[form.district] || []) : [];
    const isRent = form.transactionType === 'FOR_RENT';
    const isSale = form.transactionType === 'FOR_SALE';
    const isLand = form.propertyType === 'LAND';
    const noProjectLabel = 'Không thuộc dự án';
    const projectOptions = [noProjectLabel, ...projectList.map(p => p.name)];
    const selectedProjectName = projectList.find(p => p.id.toString() === form.projectId)?.name || noProjectLabel;

    const updateTransactionType = (transactionType: 'FOR_RENT' | 'FOR_SALE') => {
        setForm(prev => ({
            ...prev,
            transactionType,
            capacity: transactionType === 'FOR_RENT' && prev.propertyType !== 'LAND' ? prev.capacity : '',
            electricityPrice: transactionType === 'FOR_RENT' ? prev.electricityPrice : 'NEGOTIABLE',
            waterPrice: transactionType === 'FOR_RENT' ? prev.waterPrice : 'NEGOTIABLE',
            internetPrice: transactionType === 'FOR_RENT' ? prev.internetPrice : 'NEGOTIABLE',
        }));
    };

    const updatePropertyType = (propertyType: string) => {
        setForm(prev => ({
            ...prev,
            propertyType,
            bedrooms: propertyType === 'LAND' ? '0' : prev.bedrooms,
            bathrooms: propertyType === 'LAND' ? '0' : prev.bathrooms,
            capacity: propertyType === 'LAND' ? '' : prev.capacity,
            furnishingStatus: propertyType === 'LAND' ? 'UNFURNISHED' : prev.furnishingStatus,
            hasBalcony: propertyType === 'LAND' ? false : prev.hasBalcony,
        }));
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true, quality: 0.8, selectionLimit: 10,
        });
        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 10));
        }
    };

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8, videoMaxDuration: 120,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
                Alert.alert('Video quá lớn', `Vui lòng chọn video dưới 50MB.`);
                return;
            }
            setVideoUri(asset.uri);
        }
    };

    const generateAIDescription = async () => {
        if (!form.title && !form.province) {
            Alert.alert('Gợi ý', 'Vui lòng nhập tiêu đề và địa chỉ trước.');
            return;
        }
        setIsGeneratingAI(true);
        await new Promise(r => setTimeout(r, 1800));
        const addr = [form.addressDetail, form.ward, form.district, form.province].filter(Boolean).join(', ');
        const propertyLabel = PROPERTY_TYPE_OPTIONS.find(opt => opt.val === form.propertyType)?.label.toLowerCase() || 'bất động sản';
        const priceSuffix = form.transactionType === 'FOR_RENT' ? 'đ/tháng' : 'đ';
        const aiText = `${propertyLabel} tại ${addr}, diện tích ${form.area || '...'}m², giá ${form.transactionType === 'FOR_RENT' ? 'thuê' : 'bán'} chỉ ${form.price ? Number(form.price).toLocaleString('vi-VN') : '...'}${priceSuffix}.\n\n${form.propertyType !== 'LAND' ? `Nội thất ${FURNITURE_REVERSE_MAP[form.furnishingStatus] || form.furnishingStatus}.` : 'Pháp lý rõ ràng, vị trí thuận tiện.'}${form.amenities.length > 0 ? '\n\nTiện ích: ' + form.amenities.join(', ') + '.' : ''}\n\nGiao thông thuận tiện, gần các tiện ích thiết yếu. Liên hệ ngay để được tư vấn!`;
        updateForm('description', aiText);
        setIsGeneratingAI(false);
    };

    const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

    const validateStep = () => {
        if (step === 0) {
            if (!form.ward) { Alert.alert('Lỗi', 'Vui lòng chọn phường/xã'); return false; }
            if (!form.addressDetail.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ chi tiết'); return false; }
            if (!form.title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề'); return false; }
            if (!form.province) { Alert.alert('Lỗi', 'Vui lòng chọn tỉnh/thành phố'); return false; }
            if (!form.district) { Alert.alert('Lỗi', 'Vui lòng chọn quận/huyện'); return false; }
            const priceValue = Number(form.price);
            const areaValue = Number(form.area);
            if (!form.price || Number.isNaN(priceValue) || priceValue < 0) { Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ'); return false; }
            if (!form.area || Number.isNaN(areaValue) || areaValue <= 0) { Alert.alert('Lỗi', 'Vui lòng nhập diện tích lớn hơn 0'); return false; }
            // Validate tọa độ sau khi chọn địa chỉ
            if (!form.latitude || !form.longitude) {
                Alert.alert('Thiếu vị trí', 'Vui lòng chọn Phường/Xã để hệ thống xác định tọa độ tự động.');
                return false;
            }
        }
        if (step === 1 && form.transactionType === 'FOR_SALE' && !form.legalDocumentType) {
            Alert.alert('Lỗi', 'Vui lòng chọn giấy tờ pháp lý cho tin bán');
            return false;
        }
        if (step === 1 && isRent && !isLand) {
            if (!isValidUtilityPrice(form.electricityPrice) || !isValidUtilityPrice(form.waterPrice) || !isValidUtilityPrice(form.internetPrice)) {
                Alert.alert('Lỗi', 'Vui lòng chọn giá điện/nước/internet theo danh sách hợp lệ');
                return false;
            }
        }
        if (step === 2) {
            if (images.length === 0) { Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 ảnh'); return false; }
        }
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        if (step < STEPS.length - 1) setStep(s => s + 1);
    };

    // handleSubmit gọn, validate tọa độ đã ở validateStep
    const handleSubmit = async () => {
        if (!validateStep()) return;
        setIsSubmitting(true);
        try {
            setUploadProgress('Đang tải ảnh lên...');
            let imageUrls: string[] = [];
            if (images.length > 0) {
                try {
                    const imageFiles = images.map((uri, i) => ({
                        uri, name: `property_${Date.now()}_${i}.jpg`, type: 'image/jpeg',
                    }));
                    imageUrls = await mediaService.uploadMultiple(imageFiles, 'properties');
                    if (
                        !Array.isArray(imageUrls) ||
                        imageUrls.length !== images.length ||
                        imageUrls.some(url => typeof url !== 'string' || !url.startsWith('http'))
                    ) {
                        throw new Error('Upload ảnh không trả về URL hợp lệ');
                    }
                } catch (uploadErr) {
                    console.warn('[Post] Media upload failed:', uploadErr);
                    throw new Error('Upload ảnh thất bại. Vui lòng thử lại trước khi đăng tin.');
                }
            }

            let videoUrl: string | undefined;
            if (videoUri) {
                setUploadProgress('Đang tải video...');
                try {
   videoUrl = await mediaService.uploadVideo(
    videoUri, `video_${Date.now()}.mp4`, 'properties'
);
                } catch {
                    console.warn('[Post] Video upload failed');
                }
            }

            setUploadProgress('Đang đăng tin...');
            const address = [form.addressDetail, form.ward, form.district, form.province].filter(Boolean).join(', ');
            const validAmenityNames = new Set(amenityList.map(a => a.name));
            const selectedAmenities = form.amenities.filter(name => validAmenityNames.has(name));
            const body: PropertyRequestDTO = {
                transactionType: form.transactionType,
                title: form.title,
                description: form.description,
                price: Number(form.price),
                area: Number(form.area),
                address,
                province: form.province,
                district: form.district,
                ward: form.ward || '',
                street: form.addressDetail || '',
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                propertyType: form.propertyType,
                projectId: form.projectId ? Number(form.projectId) : undefined,
                capacity: isRent && !isLand && form.capacity ? Number(form.capacity) : undefined,
                validityDays: Number(form.validityDays),
                images: imageUrls,
                videoUrl,
                amenities: selectedAmenities,
                bedrooms: isLand ? undefined : Number(form.bedrooms),
                bathrooms: isLand ? undefined : Number(form.bathrooms),
                hasBalcony: isLand ? undefined : form.hasBalcony,
                furnishingStatus: isLand ? undefined : form.furnishingStatus,
                availabilityStatus: form.availabilityStatus,
                electricityPrice: isRent && !isLand ? form.electricityPrice : undefined,
                waterPrice: isRent && !isLand ? form.waterPrice : undefined,
                internetPrice: isRent && !isLand ? form.internetPrice : undefined,
                legalDocumentType: form.legalDocumentType || undefined,
            };

            if (__DEV__) {
                console.log('[Post] selected amenities:', selectedAmenities);
                console.log('[Post] final create property payload:', body);
            }
            await roomService.createRoom(body);
            setStep(3);
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Đăng bài thất bại. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
            setUploadProgress('');
        }
    };

    const resetForm = () => {
        setStep(0); setImages([]); setVideoUri(null);
        setForm({
            title: '', province: '', district: '', ward: '', addressDetail: '',
            price: '', area: '', transactionType: 'FOR_RENT', propertyType: 'ROOM', description: '',
            bedrooms: '1', bathrooms: '1', capacity: '', furnishingStatus: 'PARTIALLY_FURNISHED',
            hasBalcony: false, availabilityStatus: 'IMMEDIATELY',
            electricityPrice: 'NEGOTIABLE', waterPrice: 'NEGOTIABLE', internetPrice: 'NEGOTIABLE',
            amenities: [],
            projectId: '',
            legalDocumentType: '',
            validityDays: '30',
            latitude: '',  // ✅ Để trống
            longitude: '', // ✅ Để trống
        });
    };

    // ─── Guards ───────────────────────────────────────────────

    if (!isAuthenticated) {
        return (
            <View style={styles.authRequired}>
                <StatusBar barStyle="dark-content" />
                <Ionicons name="home-outline" size={72} color="#CCC" />
                <Text style={styles.authTitle}>Đăng nhập để đăng tin</Text>
                <TouchableOpacity style={styles.loginBtn} onPress={() => safePush('/(auth)/login' as any)}>
                    <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (kycStatus !== 'VERIFIED') {
        return (
            <View style={styles.authRequired}>
                <StatusBar barStyle="dark-content" />
                <Ionicons name="shield-checkmark-outline" size={72} color="#0066FF" />
                <Text style={styles.authTitle}>{kycStatus === 'PENDING' ? 'Đang chờ xác minh' : 'Xác minh danh tính'}</Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4, paddingHorizontal: 20, lineHeight: 20 }}>
                    {kycStatus === 'PENDING'
                        ? 'Hồ sơ KYC của bạn đang được xét duyệt. Vui lòng đợi kết quả!'
                        : 'Bạn cần xác minh danh tính (KYC) trước khi đăng tin bất động sản.'}
                </Text>
                {kycStatus !== 'PENDING' && (
                    <TouchableOpacity style={styles.loginBtn} onPress={() => safePush('/kyc' as any)}>
                        <Text style={styles.loginBtnText}>Xác minh ngay</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    if (step === 3) {
        return (
            <View style={styles.successScreen}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
                </View>
                <Text style={styles.successTitle}>Đăng tin thành công!</Text>
                <Text style={styles.successSub}>Tin đăng của bạn đang chờ được duyệt. Chúng tôi sẽ thông báo khi tin được phê duyệt.</Text>
                <TouchableOpacity style={styles.homeBtn} onPress={resetForm}>
                    <Text style={styles.homeBtnText}>Đăng tin mới</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewBtn} onPress={() => safePush('/(tabs)/profile' as any)}>
                    <Text style={styles.viewBtnText}>Xem tin đã đăng</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ─── Main Render ──────────────────────────────────────────

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => step === 0 ? router.back() : setStep(s => s - 1)}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đăng tin cho thuê</Text>
                <View style={{ width: 24 }} />
            </View>

            <StepIndicator currentStep={step} />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                <View style={styles.formContent}>

                    {/* ===== STEP 0: Cơ bản ===== */}
                    {step === 0 && (
                        <>
                            <FormField label="Hình thức giao dịch *" required>
                                <OptionButtonGroup
                                    options={TRANSACTION_TYPE_OPTIONS as unknown as { val: 'FOR_RENT' | 'FOR_SALE'; label: string }[]}
                                    value={form.transactionType}
                                    onChange={updateTransactionType}
                                />
                            </FormField>
                            <FormField label="Tiêu đề tin đăng *" required>
                                <TextInput style={styles.input} placeholder="VD: Căn hộ 2PN view đẹp, full nội thất..." value={form.title} onChangeText={v => updateForm('title', v)} />
                            </FormField>

                            <DropdownPicker
                                label="Thuộc dự án (nếu có)"
                                options={projectOptions}
                                value={selectedProjectName}
                                onChange={v => {
                                    const project = projectList.find(p => p.name === v);
                                    updateForm('projectId', project ? project.id.toString() : '');
                                }}
                                placeholder={projectLoading ? 'Đang tải dự án...' : 'Chọn dự án'}
                            />

                            <DropdownPicker
                                label="Tỉnh/Thành phố *"
                                options={Object.keys(PROVINCES)}
                                value={form.province}
                                onChange={v => {
                                    setForm(prev => ({ ...prev, province: v, district: '', ward: '', latitude: '', longitude: '' }));
                                }}
                                placeholder="Chọn tỉnh/thành phố"
                            />

                            <DropdownPicker
                                label="Quận/Huyện *"
                                options={districtOptions}
                                value={form.district}
                                onChange={v => {
                                    setForm(prev => ({ ...prev, district: v, ward: '', latitude: '', longitude: '' }));
                                    // Geocode ngay cấp quận (ward chưa có)
                                    geocodeAddress(form.province, v, '', form.addressDetail);
                                }}
                                placeholder={form.province ? 'Chọn quận/huyện' : 'Chọn tỉnh trước'}
                            />

                            <DropdownPicker
                                label="Phường/Xã"
                                options={wardOptions}
                                value={form.ward}
                                onChange={v => {
                                    updateForm('ward', v);
                                    // ✅ Geocode chính xác nhất khi có đủ phường
                                    geocodeAddress(form.province, form.district, v, form.addressDetail);
                                }}
                                placeholder={form.district ? 'Chọn phường/xã' : 'Chọn quận trước'}
                            />

                            {/* ✅ Hiển thị trạng thái geocode */}
                            {isGeocoding && (
                                <View style={styles.geocodingRow}>
                                    <ActivityIndicator size="small" color="#0066FF" />
                                    <Text style={styles.geocodingText}>Đang xác định tọa độ...</Text>
                                </View>
                            )}
                            {!isGeocoding && form.latitude && form.longitude && (
                                <View style={styles.geocodingRow}>
                                    <Ionicons name="location" size={14} color="#22C55E" />
                                    <Text style={styles.geocodingSuccess}>
                                        Đã xác định: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                                    </Text>
                                </View>
                            )}

                            <FormField label="Địa chỉ chi tiết">
                                {/* ✅ TextInput đúng cú pháp JSX, không có code lẫn vào */}
                                <TextInput
                                    style={styles.input}
                                    placeholder="Số nhà, tên đường..."
                                    value={form.addressDetail}
                                    onChangeText={v => {
                                        updateForm('addressDetail', v);
                                        // Debounce geocode sau khi người dùng nhập địa chỉ
                                        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
                                        geocodeTimer.current = setTimeout(() => {
                                            if (form.province && form.district) {
                                                geocodeAddress(form.province, form.district, form.ward, v);
                                            }
                                        }, 1500);
                                    }}
                                />
                            </FormField>

                            <FormField label={isRent ? "Giá thuê (đồng/tháng) *" : "Giá bán (đồng) *"}>
                                <TextInput style={styles.input} placeholder="VD: 5000000" value={form.price} onChangeText={v => updateForm('price', v)} keyboardType="numeric" />
                            </FormField>

                            <FormField label="Diện tích (m²) *">
                                <TextInput style={styles.input} placeholder="VD: 30" value={form.area} onChangeText={v => updateForm('area', v)} keyboardType="numeric" />
                            </FormField>

                            <FormField label="Loại BĐS">
                                <OptionButtonGroup
                                    options={PROPERTY_TYPE_OPTIONS}
                                    value={form.propertyType}
                                    onChange={updatePropertyType}
                                />
                            </FormField>

                            <FormField label="Mô tả">
                                <TextInput style={[styles.input, styles.textarea]} placeholder="Mô tả chi tiết về phòng trọ..." value={form.description} onChangeText={v => updateForm('description', v)} multiline numberOfLines={4} />
                                <TouchableOpacity style={styles.aiBtn} onPress={generateAIDescription} disabled={isGeneratingAI}>
                                    {isGeneratingAI ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Text style={styles.aiBtnIcon}>✨</Text>}
                                    <Text style={styles.aiBtnText}>{isGeneratingAI ? 'AI đang viết...' : 'AI viết mô tả'}</Text>
                                </TouchableOpacity>
                            </FormField>
                        </>
                    )}

                    {/* ===== STEP 1: Chi tiết ===== */}
                    {step === 1 && (
                        <>
                            {!isLand && (
                            <View style={styles.row2}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Phòng ngủ">
                                        <NumberStepper value={Number(form.bedrooms)} onChange={v => updateForm('bedrooms', v.toString())} min={0} max={10} />
                                    </FormField>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Phòng tắm">
                                        <NumberStepper value={Number(form.bathrooms)} onChange={v => updateForm('bathrooms', v.toString())} min={1} max={10} />
                                    </FormField>
                                </View>
                            </View>
                            )}

                            {isRent && !isLand && form.propertyType === 'ROOM' && (
                                <FormField label="Sức chứa (người)">
                                    <TextInput style={styles.input} placeholder="VD: 4" value={form.capacity} onChangeText={v => updateForm('capacity', v)} keyboardType="numeric" />
                                </FormField>
                            )}

                            {!isLand && (
                            <FormField label="Nội thất">
                                <ChipSelector
                                    options={FURNITURE_OPTIONS}
                                    selected={[FURNITURE_REVERSE_MAP[form.furnishingStatus] || form.furnishingStatus]}
                                    onToggle={v => updateForm('furnishingStatus', FURNITURE_MAP[v] || v)}
                                />
                            </FormField>
                            )}

                            {!isLand && (
                                <FormField label="Ban công">
                                    <View style={styles.switchRow}>
                                        <Text style={styles.switchLabel}>Có ban công</Text>
                                        <Switch
                                            value={form.hasBalcony}
                                            onValueChange={v => updateForm('hasBalcony', v)}
                                            trackColor={{ false: '#DDD', true: '#AAC8FF' }}
                                            thumbColor={form.hasBalcony ? '#0066FF' : '#F4F4F4'}
                                        />
                                    </View>
                                </FormField>
                            )}

                            <DropdownPicker
                                label="Tình trạng trống phòng"
                                options={AVAILABILITY_OPTIONS}
                                value={AVAILABILITY_REVERSE_MAP[form.availabilityStatus] || ''}
                                onChange={v => updateForm('availabilityStatus', AVAILABILITY_MAP[v] || v)}
                                placeholder="Chọn thời gian có thể vào ở"
                            />

                            <DropdownPicker
                                label={isSale ? 'Pháp lý *' : 'Pháp lý'}
                                options={LEGAL_DOCUMENT_OPTIONS}
                                value={LEGAL_DOCUMENT_REVERSE_MAP[form.legalDocumentType] || ''}
                                onChange={v => updateForm('legalDocumentType', LEGAL_DOCUMENT_MAP[v] || v)}
                                placeholder="Chọn giấy tờ pháp lý"
                            />

                            <DropdownPicker
                                label="Thời hạn hiển thị tin"
                                options={VALIDITY_OPTIONS}
                                value={VALIDITY_REVERSE_MAP[Number(form.validityDays)] || ''}
                                onChange={v => updateForm('validityDays', String(VALIDITY_MAP[v] || 30))}
                                placeholder="Chọn thời hạn"
                            />

                      {isRent && !isLand && (
    <>
        <DropdownPicker
            label="Giá điện"
            options={UTILITY_PRICE_OPTIONS.map(o => o.label)}
            value={UTILITY_PRICE_OPTIONS.find(o => o.val === form.electricityPrice)?.label || ''}
            onChange={v => updateForm('electricityPrice', UTILITY_PRICE_OPTIONS.find(o => o.label === v)?.val || v)}
            placeholder="Chọn giá điện"
        />
        <DropdownPicker
            label="Giá nước"
            options={UTILITY_PRICE_OPTIONS.map(o => o.label)}
            value={UTILITY_PRICE_OPTIONS.find(o => o.val === form.waterPrice)?.label || ''}
            onChange={v => updateForm('waterPrice', UTILITY_PRICE_OPTIONS.find(o => o.label === v)?.val || v)}
            placeholder="Chọn giá nước"
        />
        <DropdownPicker
            label="Internet"
            options={UTILITY_PRICE_OPTIONS.map(o => o.label)}
            value={UTILITY_PRICE_OPTIONS.find(o => o.val === form.internetPrice)?.label || ''}
            onChange={v => updateForm('internetPrice', UTILITY_PRICE_OPTIONS.find(o => o.label === v)?.val || v)}
            placeholder="Chọn internet"
        />
    </>
)}

                            <FormField label="Tiện ích">
                                {amenityLoading ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                                        <ActivityIndicator size="small" color="#0066FF" />
                                        <Text style={{ color: '#999', fontSize: 13 }}>Đang tải tiện ích...</Text>
                                    </View>
                                ) : amenityError ? (
                                    <Text style={{ color: '#999', fontSize: 13, paddingVertical: 8 }}>{amenityError}</Text>
                                ) : amenityList.length === 0 ? (
                                    <Text style={{ color: '#999', fontSize: 13, paddingVertical: 8 }}>Chưa có tiện ích</Text>
                                ) : (
                                    <ChipSelector
                                        options={amenityList.map(a => a.name)}
                                        selected={form.amenities}
                                        onToggle={toggleAmenity}
                                    />
                                )}
                            </FormField>
                        </>
                    )}

                    {/* ===== STEP 2: Ảnh & Video ===== */}
                    {step === 2 && (
                        <>
                            <View style={styles.imagePickerSection}>
                                <Text style={styles.imageCount}>{images.length}/10 ảnh</Text>
                                <View style={styles.mediaButtons}>
                                    <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                                        <Ionicons name="images" size={20} color="#0066FF" />
                                        <Text style={styles.addImageText}>Thêm ảnh</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.addImageBtn, styles.addVideoBtn]} onPress={pickVideo}>
                                        <Ionicons name="videocam" size={20} color="#8B5CF6" />
                                        <Text style={[styles.addImageText, { color: '#8B5CF6' }]}>Thêm video</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {videoUri && <VideoPreviewPlayer key={videoUri} uri={videoUri} onRemove={() => setVideoUri(null)} />}

                            {images.length === 0 ? (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="images-outline" size={56} color="#CCC" />
                                    <Text style={styles.imagePlaceholderText}>Chọn ít nhất 1 ảnh cho tin đăng</Text>
                                    <Text style={styles.imagePlaceholderSub}>Ảnh chất lượng cao giúp tăng khả năng cho thuê</Text>
                                </View>
                            ) : (
                                <View style={styles.imageGrid}>
                                    {images.map((uri, index) => (
                                        <View key={index} style={styles.imageWrapper}>
                                            <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                                            {index === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Ảnh bìa</Text></View>}
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                                                <Ionicons name="close-circle" size={22} color="white" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {images.length < 10 && (
                                        <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
                                            <Ionicons name="add" size={32} color="#0066FF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {step > 0 && (
                    <TouchableOpacity style={styles.backBtnBtn} onPress={() => setStep(s => s - 1)}>
                        <Text style={styles.backBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                )}
                {step < 2 ? (
                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextBtnText}>Tiếp theo</Text>
                        <Ionicons name="arrow-forward" size={18} color="white" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextBtn, isSubmitting && styles.nextBtnDisabled]}
                        onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <View style={{ alignItems: 'center' }}>
                                <ActivityIndicator color="white" />
                                {!!uploadProgress && <Text style={styles.uploadProgressText}>{uploadProgress}</Text>}
                            </View>
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={18} color="white" />
                                <Text style={styles.nextBtnText}>Đăng tin</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40, backgroundColor: 'white' },
    authTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
    loginBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14 },
    loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    stepItem: { alignItems: 'center', gap: 4 },
    stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
    stepCircleActive: { backgroundColor: '#0066FF' },
    stepNum: { fontSize: 12, fontWeight: '700', color: '#999' },
    stepNumActive: { color: 'white' },
    stepLabel: { fontSize: 10, color: '#999' },
    stepLabelActive: { color: '#0066FF', fontWeight: '600' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginBottom: 12 },
    stepLineActive: { backgroundColor: '#0066FF' },
    scrollView: { flex: 1 },
    formContent: { padding: 16, gap: 4 },
    formField: { marginBottom: 16 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
    textarea: { height: 100, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: 12 },
    toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    toggleBtn: { flex: 1, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, alignItems: 'center' },
    toggleBtnActive: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    toggleText: { fontSize: 14, color: '#888' },
    toggleTextActive: { color: '#0066FF', fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20, backgroundColor: 'white' },
    chipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    chipText: { fontSize: 13, color: '#666' },
    chipTextSelected: { color: '#0066FF', fontWeight: '600' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    stepperBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    stepperValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', minWidth: 30, textAlign: 'center' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    switchLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
    dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
    dropdownValue: { fontSize: 15, color: '#1A1A1A' },
    dropdownPlaceholder: { fontSize: 15, color: '#BBB' },
    dropdownList: { maxHeight: 200, backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, marginTop: 4 },
    dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
    dropdownItemSelected: { backgroundColor: '#E8F0FF' },
    dropdownItemText: { fontSize: 14, color: '#333' },
    dropdownItemTextSelected: { color: '#0066FF', fontWeight: '600' },
    geocodingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: -8 },
    geocodingText: { fontSize: 12, color: '#0066FF' },
    geocodingSuccess: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
    imagePickerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    imageCount: { fontSize: 15, fontWeight: '600', color: '#333' },
    addImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addImageText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    imagePlaceholder: { alignItems: 'center', paddingVertical: 48, gap: 8, backgroundColor: 'white', borderRadius: 16, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed' },
    imagePlaceholderText: { fontSize: 15, fontWeight: '600', color: '#555' },
    imagePlaceholderSub: { fontSize: 13, color: '#999', textAlign: 'center' },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    imageWrapper: { width: '30%', aspectRatio: 1, position: 'relative' },
    imageThumb: { width: '100%', height: '100%', borderRadius: 10 },
    mainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#0066FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    mainBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
    removeImageBtn: { position: 'absolute', top: -4, right: -4 },
    addMoreBtn: { width: '30%', aspectRatio: 1, backgroundColor: '#F0F5FF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0066FF', borderStyle: 'dashed' },
    aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F0FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8, alignSelf: 'flex-start' },
    aiBtnIcon: { fontSize: 16 },
    aiBtnText: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
    mediaButtons: { flexDirection: 'row', gap: 12 },
    addVideoBtn: { borderRadius: 8, backgroundColor: '#F5F0FF', paddingHorizontal: 10, paddingVertical: 6 },
    videoPreviewContainer: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 14, height: 200 },
    videoPreview: { width: '100%', height: '100%', backgroundColor: 'black' },
    removeVideoBtn: { position: 'absolute', top: 8, right: 8 },
    videoBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    videoBadgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
    bottomBar: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    backBtnBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    backBtnText: { fontSize: 15, fontWeight: '600', color: '#555' },
    nextBtn: { flex: 2, backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    nextBtnDisabled: { backgroundColor: '#AAC8FF' },
    nextBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    uploadProgressText: { color: 'white', fontSize: 11, marginTop: 4 },
    successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40, backgroundColor: 'white' },
    successIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    successTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
    successSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
    homeBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14, marginTop: 8 },
    homeBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    viewBtn: { borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14 },
    viewBtnText: { color: '#0066FF', fontWeight: '700', fontSize: 16 },
});
