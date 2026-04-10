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
     * Upload nhiều file, trả về mảng URL
     */
    uploadMultiple: async (
        files: { uri: string; name: string; type: string }[],
        folder: string = 'properties'
    ): Promise<string[]> => {
        const urls: string[] = [];
        for (const file of files) {
            const url = await mediaService.uploadFile(file.uri, file.name, file.type, folder);
            urls.push(url);
        }
        return urls;
    },
};
