import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Appointment, PaginatedResponse } from '../../types';

export const appointmentService = {
    getMyAppointments: async (page = 0, size = 10): Promise<PaginatedResponse<Appointment>> => {
        const response = await apiClient.get<PaginatedResponse<Appointment>>(API_ENDPOINTS.APPOINTMENTS, {
            params: { page, size },
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
    }): Promise<Appointment> => {
        const response = await apiClient.post<Appointment>(API_ENDPOINTS.APPOINTMENTS, data);
        return response.data;
    },

    updateStatus: async (id: number, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'): Promise<Appointment> => {
        const response = await apiClient.put<Appointment>(`/appointments/${id}/status`, { status });
        return response.data;
    },

    cancelAppointment: async (id: number): Promise<void> => {
        await apiClient.put(`/appointments/${id}/status`, { status: 'CANCELLED' });
    },
};
