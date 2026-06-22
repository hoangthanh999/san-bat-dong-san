import {
    API_ENDPOINTS,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET,
} from '../../constants';
import { getApiBaseUrl } from './environment';


async function sha1(str: string): Promise<string> {
    const rotl = (n: number, s: number) => (n << s) | (n >>> (32 - s));
    const W = new Array(80);
    let H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) { bytes.push((c >> 6) | 192); bytes.push((c & 63) | 128); }
        else { bytes.push((c >> 12) | 224); bytes.push(((c >> 6) & 63) | 128); bytes.push((c & 63) | 128); }
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 255);
    for (let chunk = 0; chunk < bytes.length; chunk += 64) {
        for (let i = 0; i < 16; i++)
            W[i] = (bytes[chunk+i*4]<<24)|(bytes[chunk+i*4+1]<<16)|(bytes[chunk+i*4+2]<<8)|bytes[chunk+i*4+3];
        for (let i = 16; i < 80; i++)
            W[i] = rotl(W[i-3]^W[i-8]^W[i-14]^W[i-16], 1);
        let [a, b, c, d, e] = [H0, H1, H2, H3, H4];
        for (let i = 0; i < 80; i++) {
            let f: number, k: number;
            if (i < 20)      { f = (b & c) | (~b & d); k = 0x5A827999; }
            else if (i < 40) { f = b ^ c ^ d;           k = 0x6ED9EBA1; }
            else if (i < 60) { f = (b & c)|(b & d)|(c & d); k = 0x8F1BBCDC; }
            else             { f = b ^ c ^ d;           k = 0xCA62C1D6; }
            const temp = (rotl(a, 5) + f + e + k + W[i]) >>> 0;
            [e, d, c, b, a] = [d, c, rotl(b, 30) >>> 0, a, temp];
        }
        H0=(H0+a)>>>0; H1=(H1+b)>>>0; H2=(H2+c)>>>0; H3=(H3+d)>>>0; H4=(H4+e)>>>0;
    }
    return [H0,H1,H2,H3,H4].map(h => h.toString(16).padStart(8,'0')).join('');
}


export const mediaService = {
    /**
     * Upload file lên media-service (Cloudinary proxy)
     * POST /api/v1/media/upload
     * @param fileUri - URI cục bộ của file
     * @param fileName - Tên file
     * @param mimeType - MIME type (image/jpeg, video/mp4...)
     * @param folder - Folder trên Cloudinary (default: 'general')
     * @returns URL của file đã upload
     */
    uploadFile: async (
        fileUri: string,
        fileName: string,
        mimeType: string = 'image/jpeg',
        folder: string = 'properties'
    ): Promise<string> => {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const { STORAGE_KEYS } = await import('../../constants');

        const formData = new FormData();
        formData.append('file', {
            uri: fileUri,
            name: fileName,
            type: mimeType,
        } as any);
        formData.append('folder', folder);

        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const response = await fetch(`${await getApiBaseUrl()}${API_ENDPOINTS.MEDIA_UPLOAD}`, {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Upload file thất bại');
        return json.result !== undefined ? json.result : json; // unwrapped → string URL
    },

    /**
     * Upload nhiều file cùng lúc (batch) — dùng endpoint upload-multiple
     * POST /api/v1/media/upload-multiple — field: "files" (lặp nhiều lần), param: folder
     * @returns Mảng URL đã upload
     */
    uploadMultiple: async (
        files: { uri: string; name: string; type: string }[],
        folder: string = 'properties'
    ): Promise<string[]> => {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const { STORAGE_KEYS } = await import('../../constants');

        const formData = new FormData();
          console.log('[uploadMultiple] files count:', files.length);
        files.forEach((file) => {
            formData.append('files', {   // Key là "files" (số nhiều) — backend @RequestParam("files")
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);
        });
        formData.append('folder', folder);

        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const response = await fetch(`${await getApiBaseUrl()}${API_ENDPOINTS.MEDIA_UPLOAD_MULTIPLE}`, {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        });
        const json = await response.json();
            console.log('[uploadMultiple] response:', json);

        if (!response.ok) throw new Error(json.message || 'Upload nhiều file thất bại');
        // Unwrap ApiResponse.result → string[]
        return (json.result !== undefined ? json.result : json) as string[];
    },
uploadVideo: async (
        fileUri: string,
        fileName: string,
        folder: string = 'properties'
    ): Promise<string> => {
        const CLOUD_NAME = CLOUDINARY_CLOUD_NAME;
        const uploadPreset = CLOUDINARY_UPLOAD_PRESET;
        if (!CLOUD_NAME || !uploadPreset) {
            throw new Error('Thiếu cấu hình Cloudinary để upload video');
        }
        const folderPath = `homeverse/${folder}`;

        const formData = new FormData();
        formData.append('file', { uri: fileUri, name: fileName, type: 'video/mp4' } as any);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folderPath);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
            { method: 'POST', body: formData }
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.secure_url;
    },
};
