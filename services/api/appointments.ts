import apiClient from './client';
import { Appointment, AppointmentStatus, PaginatedResponse } from '../../types';

type BackendAppointmentStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'SUGGESTED';

interface BackendAppointmentResponse {
    id: number;
    propertyId: number;
    propertyTitle?: string;
    propertyImage?: string;
    userId: number;
    ownerId: number;
    partnerId?: number;
    appointmentTime?: string;
    scheduledAt?: string;
    note?: string;
    status: BackendAppointmentStatus | 'CONFIRMED' | 'RESCHEDULED';
    suggestedTime?: string;
    suggestedNote?: string;
    myRequest?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateAppointmentRequest = {
    propertyId?: number;
    appointmentTime?: string;
    roomId?: number;
    scheduledAt?: string;
    note?: string;
    message?: string;
};

const normalizeStatus = (status: BackendAppointmentResponse['status']): AppointmentStatus => {
    if (status === 'CONFIRMED') return 'ACCEPTED';
    if (status === 'RESCHEDULED') return 'SUGGESTED';
    return status;
};

const mapAppointment = (item: BackendAppointmentResponse): Appointment => {
    const scheduledAt = item.appointmentTime || item.scheduledAt || '';

    return {
        ...item,
        propertyId: item.propertyId,
        roomId: item.propertyId,
        propertyTitle: item.propertyTitle,
        propertyImage: item.propertyImage,
        roomTitle: item.propertyTitle,
        roomImage: item.propertyImage,
        tenantId: item.userId,
        userId: item.userId,
        ownerId: item.ownerId,
        landlordId: item.ownerId,
        appointmentTime: scheduledAt,
        scheduledAt,
        suggestedTime: item.suggestedTime,
        suggestedMeetTime: item.suggestedTime,
        suggestedNote: item.suggestedNote,
        status: normalizeStatus(item.status),
        createdAt: item.createdAt || scheduledAt,
        updatedAt: item.updatedAt,
        myRequest: item.myRequest,
    };
};

const buildPage = (
    content: Appointment[],
    page: number,
    size: number
): PaginatedResponse<Appointment> => ({
    content,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    size,
    number: page,
    first: page === 0,
    last: true,
});

export const appointmentService = {
    getMyAppointments: async (page = 0, size = 10, status?: AppointmentStatus): Promise<PaginatedResponse<Appointment>> => {
        const response = await apiClient.get<BackendAppointmentResponse[]>('/appointments/my-calendar');
        const appointments = response.data
            .map(mapAppointment)
            .filter((item) => !status || item.status === status);

        return buildPage(appointments, page, size);
    },

    getAppointmentById: async (id: number): Promise<Appointment | null> => {
        const data = await appointmentService.getMyAppointments(0, 100);
        return data.content.find((item) => item.id === id) || null;
    },

    createAppointment: async (data: CreateAppointmentRequest): Promise<Appointment> => {
        const propertyId = data.propertyId ?? data.roomId;
        const appointmentTime = data.appointmentTime ?? data.scheduledAt;

        if (!propertyId || !appointmentTime) {
            throw new Error('Thieu thong tin bat dong san hoac thoi gian dat lich.');
        }

        const response = await apiClient.post<BackendAppointmentResponse>('/appointments', {
            propertyId,
            appointmentTime,
            note: data.note || data.message || '',
        });

        return mapAppointment(response.data);
    },

    confirmAppointment: async (id: number): Promise<Appointment> => {
        return appointmentService.updateStatus(id, 'ACCEPTED');
    },

    rescheduleAppointment: async (id: number, suggestedMeetTime: string): Promise<Appointment> => {
        const response = await apiClient.put<BackendAppointmentResponse>(`/appointments/${id}/suggest`, null, {
            params: { newTime: suggestedMeetTime },
        });
        return mapAppointment(response.data);
    },

    acceptReschedule: async (id: number): Promise<Appointment> => {
        const response = await apiClient.put<BackendAppointmentResponse>(`/appointments/${id}/accept-suggestion`);
        return mapAppointment(response.data);
    },

    cancelAppointment: async (id: number): Promise<Appointment> => {
        return appointmentService.updateStatus(id, 'CANCELLED');
    },

    updateStatus: async (id: number, status: BackendAppointmentStatus): Promise<Appointment> => {
        const response = await apiClient.put<BackendAppointmentResponse>(`/appointments/${id}/status`, null, {
            params: { status },
        });
        return mapAppointment(response.data);
    },
};
