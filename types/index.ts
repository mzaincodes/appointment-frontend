/**
 * API types, mirroring the backend's domain shapes.
 *
 * Kept as a hand-written mirror rather than generated: the surface is small,
 * and an explicit file makes the contract between the two services something a
 * reader can see in one place.
 */

export type UserRole = 'USER' | 'ADMIN';
export type AppointmentStatus = 'BOOKED' | 'COMPLETED' | 'CANCELLED';
export type AppointmentSource = 'WEB' | 'CHATBOT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  userId: string | null;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  serviceId: string | null;
  serviceName: string | null;
  reason: string;
  notes: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One cell in the slot grid. `reason` explains why it cannot be picked. */
export interface SlotView {
  time: string;
  endTime: string;
  label: string;
  available: boolean;
  reason: 'BOOKED' | 'PAST' | 'CLOSED' | null;
}

export interface DayAvailability {
  date: string;
  dayName: string;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  slotDurationMinutes: number;
  available: string[];
  slots: SlotView[];
  message?: string;
}

export interface DaySummary {
  date: string;
  dayName: string;
  isOpen: boolean;
  availableCount: number;
  totalSlots: number;
  isPast: boolean;
}

export interface AppointmentStats {
  today: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  total: number;
  todayRemaining: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMin: number;
  priceFrom: number | null;
  icon: string | null;
  displayOrder: number;
}

export interface ClinicHours {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface ClinicInfo {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  slotDurationMinutes: number;
  hours: ClinicHours[];
  services: Service[];
  dentists: { name: string; bio: string }[];
  location: string;
}

export interface KnowledgeDocument {
  id: string;
  category: string;
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type MessagePayload =
  | {
      type: 'slots';
      date: string;
      dayName: string;
      slots: string[];
      message?: string;
    }
  | { type: 'booking_confirmed'; appointment: Appointment }
  | { type: 'appointment_list'; appointments: Appointment[] }
  | { type: 'appointment_cancelled'; appointmentId: string }
  | { type: 'services'; services: Service[] }
  | { type: 'quick_replies'; options: string[] };

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  payload: MessagePayload | null;
  createdAt: string;
  /** Client-side only: an optimistic message that has not been acknowledged. */
  pending?: boolean;
  /** Client-side only: the message failed to send. */
  failed?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string | null;
  title: string | null;
  bookingContext: Record<string, unknown>;
  createdAt: string;
  lastMessageAt: string;
}

export interface AiProviderInfo {
  name: string;
  model: string;
  isLive: boolean;
}

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  scope?: 'today' | 'upcoming' | 'past';
  search?: string;
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: 'date_asc' | 'date_desc' | 'created_desc';
}

export interface CreateAppointmentPayload {
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  appointmentDate: string;
  startTime: string;
  serviceId?: string | null;
  reason: string;
  notes?: string | null;
}
