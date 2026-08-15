import { api, toQuery } from './api-client';
import type {
  Appointment,
  AppointmentFilters,
  AppointmentStats,
  ChatMessage,
  ChatSession,
  ClinicInfo,
  CreateAppointmentPayload,
  DayAvailability,
  DaySummary,
  KnowledgeDocument,
  Paginated,
  Service,
  User,
  AiProviderInfo,
} from '@/types';

/**
 * API service layer.
 *
 * One function per endpoint, grouped by domain. Components call these rather
 * than composing URLs, so a route change is a single edit here and every call
 * site keeps its types.
 */

export const authService = {
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    api.post<{ user: User; token: string; claimedAppointments: number }>('/auth/register', input, {
      auth: false,
    }),

  login: (input: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/login', input, {
      auth: false,
    }),

  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),

  updateProfile: (input: { name?: string; phone?: string | null }) =>
    api.patch<{ user: User }>('/auth/me', input),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post<{ changed: boolean }>('/auth/change-password', input),
};

export const clinicService = {
  getInfo: () => api.get<ClinicInfo>('/clinic', { auth: false }),
  getServices: () => api.get<{ services: Service[] }>('/clinic/services', { auth: false }),
  getFaq: () => api.get<{ documents: KnowledgeDocument[] }>('/clinic/faq', { auth: false }),
};

export const appointmentService = {
  /**
   * Availability for one date.
   *
   * The browser holds no slot logic of its own — this is the only source of
   * what can be booked, so the calendar cannot drift from what the server will
   * actually accept.
   */
  getAvailability: (date: string) =>
    api.get<DayAvailability>(`/appointments/availability?date=${date}`, {
      auth: false,
    }),

  getAvailabilityRange: (from: string, days = 14) =>
    api.get<{ days: DaySummary[] }>(`/appointments/availability/range?from=${from}&days=${days}`, {
      auth: false,
    }),

  getNextAvailable: () =>
    api.get<{
      next: { date: string; dayName: string; slots: string[] } | null;
    }>('/appointments/next-available', { auth: false }),

  /** Works signed in or out; the token is attached when present. */
  create: (payload: CreateAppointmentPayload) =>
    api.post<{ appointment: Appointment }>('/appointments', payload),

  list: (filters: AppointmentFilters = {}) =>
    api.get<Paginated<Appointment>>(`/appointments${toQuery(filters as Record<string, unknown>)}`),

  getById: (id: string) => api.get<{ appointment: Appointment }>(`/appointments/${id}`),

  /** Guest retrieval — requires the email the booking was made with. */
  lookup: (id: string, email: string) =>
    api.get<{ appointment: Appointment }>(
      `/appointments/lookup?id=${id}&email=${encodeURIComponent(email)}`,
      { auth: false },
    ),

  reschedule: (id: string, input: { appointmentDate: string; startTime: string }) =>
    api.patch<{ appointment: Appointment }>(`/appointments/${id}`, input),

  cancel: (id: string) => api.delete<{ appointment: Appointment }>(`/appointments/${id}`),
};

export const adminService = {
  listAppointments: (filters: AppointmentFilters = {}) =>
    api.get<Paginated<Appointment>>(
      `/admin/appointments${toQuery(filters as Record<string, unknown>)}`,
    ),

  getStats: () => api.get<AppointmentStats>('/admin/appointments/stats'),

  getAppointment: (id: string) =>
    api.get<{ appointment: Appointment }>(`/admin/appointments/${id}`),

  createAppointment: (payload: CreateAppointmentPayload) =>
    api.post<{ appointment: Appointment }>('/admin/appointments', payload),

  updateAppointment: (
    id: string,
    changes: Partial<CreateAppointmentPayload> & { status?: string },
  ) => api.patch<{ appointment: Appointment }>(`/admin/appointments/${id}`, changes),

  complete: (id: string) =>
    api.patch<{ appointment: Appointment }>(`/admin/appointments/${id}/complete`),

  cancel: (id: string) =>
    api.patch<{ appointment: Appointment }>(`/admin/appointments/${id}/cancel`),

  remove: (id: string) => api.delete<{ deleted: boolean }>(`/admin/appointments/${id}`),
};

export const chatService = {
  /** Opens or adopts a conversation. Used by the HTTP fallback path. */
  createSession: (sessionId?: string) =>
    api.post<{
      session: ChatSession;
      messages: ChatMessage[];
      welcome: { content: string; payload: unknown } | null;
      provider: AiProviderInfo;
    }>('/chat/sessions', sessionId ? { sessionId } : {}),

  getMessages: (sessionId: string) =>
    api.get<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`),

  /** Fallback for when the websocket cannot connect. */
  sendMessage: (sessionId: string, content: string) =>
    api.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
      `/chat/sessions/${sessionId}/messages`,
      { content },
    ),
};

export { ApiError, tokenStorage, API_URL } from './api-client';
