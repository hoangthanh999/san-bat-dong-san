import { API_ENDPOINTS } from '../../constants';

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
        const { API_BASE_URL, STORAGE_KEYS } = await import('../../constants');

        const formData = new FormData();
        formData.append('file', {
            uri: fileUri,
            name: fileName,
            type: mimeType,
        } as any);
        formData.append('folder', folder);

        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEDIA_UPLOAD}`, {
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
        const { API_BASE_URL, STORAGE_KEYS } = await import('../../constants');

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', {   // Key là "files" (số nhiều) — backend @RequestParam("files")
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);
        });
        formData.append('folder', folder);

        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEDIA_UPLOAD_MULTIPLE}`, {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Upload nhiều file thất bại');
        // Unwrap ApiResponse.result → string[]
        return (json.result !== undefined ? json.result : json) as string[];
    },
};
