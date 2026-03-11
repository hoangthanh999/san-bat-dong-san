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

    fetchAppointments: (reset?: boolean) => Promise<void>;
    createAppointment: (data: { roomId: number; scheduledAt: string; note?: string }) => Promise<void>;
    cancelAppointment: (id: number) => Promise<void>;
    confirmAppointment: (id: number) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
    appointments: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    hasMore: true,
    page: 0,

    fetchAppointments: async (reset = false) => {
        if (!reset && !get().hasMore) return;
        const page = reset ? 0 : get().page;
        set({ isLoading: true });
        try {
            const data = await appointmentService.getMyAppointments(page);
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

            // Schedule local notification nhắc lịch hẹn (1 giờ trước)
            // Bỏ qua lỗi nếu không schedule được
            scheduleAppointmentReminder({
                appointmentId: appointment.id,
                roomId: appointment.roomId,
                roomTitle: `Phòng #${appointment.roomId}`,
                scheduledAt: appointment.scheduledAt,
                landlordName: 'Chủ nhà',
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
        } catch (error) {
            console.error('Cancel appointment error', error);
        }
    },

    confirmAppointment: async (id: number) => {
        try {
            await appointmentService.updateStatus(id, 'CONFIRMED');
            set(state => ({
                appointments: state.appointments.map(a =>
                    a.id === id ? { ...a, status: 'CONFIRMED' as const } : a
                ),
            }));
        } catch (error) {
            console.error('Confirm appointment error', error);
        }
    },
}));
