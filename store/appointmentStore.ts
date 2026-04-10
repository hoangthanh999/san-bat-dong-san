import { create } from 'zustand';
import { Appointment, PaginatedResponse } from '../types';
import { appointmentService } from '../services/api/appointments';
import { scheduleAppointmentReminder } from '../services/pushNotificationService';

interface AppointmentState {
    appointments: Appointment[];
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    hasMore: boolean;
    page: number;

    fetchAppointments: (reset?: boolean, status?: string) => Promise<void>;
    createAppointment: (data: { roomId: number; scheduledAt: string; note?: string; message?: string }) => Promise<void>;
    cancelAppointment: (id: number) => Promise<void>;
    confirmAppointment: (id: number) => Promise<void>;
    rescheduleAppointment: (id: number, suggestedMeetTime: string) => Promise<void>;
    acceptReschedule: (id: number) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
    appointments: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    hasMore: true,
    page: 0,

    fetchAppointments: async (reset = false, status?: string) => {
        if (!reset && !get().hasMore) return;
        const page = reset ? 0 : get().page;
        set({ isLoading: true });
        try {
            const data = await appointmentService.getMyAppointments(page, 10, status);
            set(state => ({
                appointments: reset ? data.content : [...state.appointments, ...data.content],
                hasMore: !data.last,
                page: data.number + 1,
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    createAppointment: async (data) => {
        set({ isSubmitting: true, error: null });
        try {
            const appointment = await appointmentService.createAppointment(data);
            set(state => ({
                appointments: [appointment, ...state.appointments],
                isSubmitting: false,
            }));

            scheduleAppointmentReminder({
                appointmentId: appointment.id,
                roomId: appointment.roomId,
                roomTitle: appointment.roomTitle || `Phòng #${appointment.roomId}`,
                scheduledAt: appointment.scheduledAt,
                landlordName: appointment.landlordName || 'Chủ nhà',
            }).catch(console.warn);
        } catch (error: any) {
            set({ error: error.message || 'Đặt lịch thất bại', isSubmitting: false });
            throw error;
        }
    },

    cancelAppointment: async (id: number) => {
        try {
            await appointmentService.cancelAppointment(id);
            set(state => ({
                appointments: state.appointments.map(a =>
                    a.id === id ? { ...a, status: 'CANCELLED' as const } : a
                ),
            }));
        } catch (error: any) {
            set({ error: error.message || 'Hủy lịch hẹn thất bại' });
            throw error;
        }
    },

    confirmAppointment: async (id: number) => {
        try {
            const updated = await appointmentService.confirmAppointment(id);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error) {
            console.error('Confirm appointment error', error);
            throw error;
        }
    },

    rescheduleAppointment: async (id: number, suggestedMeetTime: string) => {
        try {
            const updated = await appointmentService.rescheduleAppointment(id, suggestedMeetTime);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error) {
            console.error('Reschedule appointment error', error);
            throw error;
        }
    },

    acceptReschedule: async (id: number) => {
        try {
            const updated = await appointmentService.acceptReschedule(id);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error) {
            console.error('Accept reschedule error', error);
            throw error;
        }
    },
}));
