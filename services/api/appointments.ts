import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Appointment, PaginatedResponse } from '../../types';

export const appointmentService = {
    getMyAppointments: async (page = 0, size = 10, status?: string): Promise<PaginatedResponse<Appointment>> => {
        const response = await apiClient.get<PaginatedResponse<Appointment>>(API_ENDPOINTS.APPOINTMENTS, {
            params: { page, size, ...(status ? { status } : {}) },
        });
        return response.data;
    },

    getAppointmentById: async (id: number): Promise<Appointment> => {
        const response = await apiClient.get<Appointment>(API_ENDPOINTS.APPOINTMENT_BY_ID(id));
        return response.data;
    },

    createAppointment: async (data: {
        roomId: number;
        scheduledAt: string;
        note?: string;
        message?: string;
    }): Promise<Appointment> => {
        const response = await apiClient.post<Appointment>(API_ENDPOINTS.APPOINTMENTS, data);
        return response.data;
    },

    /** Landlord xác nhận lịch hẹn */
    confirmAppointment: async (id: number): Promise<Appointment> => {
        const response = await apiClient.patch<Appointment>(`/appointments/${id}/confirm`);
        return response.data;
    },

    /** Landlord đề xuất giờ khác */
    rescheduleAppointment: async (id: number, suggestedMeetTime: string): Promise<Appointment> => {
        const response = await apiClient.patch<Appointment>(`/appointments/${id}/reschedule`, {
            suggestedMeetTime,
        });
        return response.data;
    },

    /** Tenant đồng ý giờ mới do chủ nhà đề xuất */
    acceptReschedule: async (id: number): Promise<Appointment> => {
        const response = await apiClient.patch<Appointment>(`/appointments/${id}/accept-reschedule`);
        return response.data;
    },

    cancelAppointment: async (id: number): Promise<void> => {
        await apiClient.patch(`/appointments/${id}/cancel`);
    },

    updateStatus: async (id: number, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'): Promise<Appointment> => {
        const response = await apiClient.put<Appointment>(`/appointments/${id}/status`, { status });
        return response.data;
    },
};
