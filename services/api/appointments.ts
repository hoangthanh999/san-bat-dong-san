// ⚠️ Backend KHÔNG có Appointment Service — đã xóa toàn bộ API calls
// File giữ lại để tránh import errors, tất cả trả về dữ liệu rỗng

import { Appointment, PaginatedResponse } from '../../types';

export const appointmentService = {
    getMyAppointments: async (page = 0, size = 10, status?: string): Promise<PaginatedResponse<Appointment>> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
    },

    getAppointmentById: async (id: number): Promise<Appointment | null> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return null;
    },

    createAppointment: async (data: {
        roomId: number;
        scheduledAt: string;
        note?: string;
        message?: string;
    }): Promise<Appointment | null> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return null;
    },

    confirmAppointment: async (id: number): Promise<Appointment | null> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return null;
    },

    rescheduleAppointment: async (id: number, suggestedMeetTime: string): Promise<Appointment | null> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return null;
    },

    acceptReschedule: async (id: number): Promise<Appointment | null> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return null;
    },

    cancelAppointment: async (id: number): Promise<void> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
    },

    updateStatus: async (id: number, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'): Promise<Appointment | null> => {
        console.warn('[appointmentService] Backend KHÔNG có Appointment API — chức năng đang phát triển');
        return null;
    },
};
