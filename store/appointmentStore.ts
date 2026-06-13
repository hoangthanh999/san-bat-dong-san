import { create } from 'zustand';
import { Appointment, AppointmentStatus } from '../types';
import { appointmentService } from '../services/api/appointments';
import { scheduleAppointmentReminder } from '../services/pushNotificationService';

interface AppointmentState {
    appointments: Appointment[];
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    hasMore: boolean;
    page: number;

    fetchAppointments: (reset?: boolean, status?: AppointmentStatus) => Promise<void>;
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

    fetchAppointments: async (reset = false, status?: AppointmentStatus) => {
        if (!reset && !get().hasMore) return;

        const page = reset ? 0 : get().page;
        set({ isLoading: true, error: null });

        try {
            const data = await appointmentService.getMyAppointments(page, 10, status);
            set(state => ({
                appointments: reset ? data.content : [...state.appointments, ...data.content],
                hasMore: !data.last,
                page: data.number + 1,
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message || 'Khong the tai danh sach lich hen', isLoading: false });
            throw error;
        }
    },

    createAppointment: async (data) => {
        set({ isSubmitting: true, error: null });

        try {
            const appointment = await appointmentService.createAppointment(data);
            set(state => ({
                appointments: [appointment, ...state.appointments.filter((a) => a.id !== appointment.id)],
                isSubmitting: false,
            }));

            scheduleAppointmentReminder({
                appointmentId: appointment.id,
                roomId: appointment.roomId,
                roomTitle: appointment.roomTitle || `Phong #${appointment.roomId}`,
                scheduledAt: appointment.scheduledAt,
                landlordName: appointment.landlordName || 'Chu nha',
            }).catch(console.warn);
        } catch (error: any) {
            set({ error: error.message || 'Dat lich that bai', isSubmitting: false });
            throw error;
        }
    },

    cancelAppointment: async (id: number) => {
        try {
            const updated = await appointmentService.cancelAppointment(id);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error: any) {
            set({ error: error.message || 'Huy lich hen that bai' });
            throw error;
        }
    },

    confirmAppointment: async (id: number) => {
        try {
            const updated = await appointmentService.confirmAppointment(id);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error: any) {
            set({ error: error.message || 'Xac nhan lich hen that bai' });
            throw error;
        }
    },

    rescheduleAppointment: async (id: number, suggestedMeetTime: string) => {
        try {
            const updated = await appointmentService.rescheduleAppointment(id, suggestedMeetTime);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error: any) {
            set({ error: error.message || 'De xuat gio moi that bai' });
            throw error;
        }
    },

    acceptReschedule: async (id: number) => {
        try {
            const updated = await appointmentService.acceptReschedule(id);
            set(state => ({
                appointments: state.appointments.map(a => a.id === id ? updated : a),
            }));
        } catch (error: any) {
            set({ error: error.message || 'Chap nhan gio moi that bai' });
            throw error;
        }
    },
}));
