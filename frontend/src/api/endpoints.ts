import { apiClient } from './client';
import {
  DashboardData,
  Room,
  RoomType,
  Floor,
  Reservation,
  Guest,
  GuestFolio,
  Invoice,
  HousekeepingTask,
  RestaurantTable,
  MenuCategory,
  RestaurantOrder,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  MaintenanceRequest,
  Employee,
  Shift,
  Hotel,
  AuditLogItem,
  NotificationItem,
} from '../types';

export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardData> => {
    const res = await apiClient.get('/dashboard/stats');
    const data = res.data;
    return {
      ...data,
      revenue_trend: data.revenue_trend ?? [],
      source_breakdown: data.source_breakdown ?? [],
      recent_reservations: data.recent_reservations ?? [],
      upcoming_arrivals: data.upcoming_arrivals ?? [],
      upcoming_departures: data.upcoming_departures ?? [],
      notifications: data.notifications ?? [],
    };
  },
};

export const roomsApi = {
  getRooms: async (params?: { status?: string; floor_id?: string; room_type_id?: string }): Promise<Room[]> => {
    const res = await apiClient.get('/rooms', { params });
    return res.data.rooms ?? [];
  },
  getRoomTypes: async (): Promise<RoomType[]> => {
    const res = await apiClient.get('/room-types');
    return res.data.room_types ?? [];
  },
  getFloors: async (): Promise<Floor[]> => {
    const res = await apiClient.get('/floors');
    return res.data.floors ?? [];
  },
  createRoom: async (data: any): Promise<Room> => {
    const res = await apiClient.post('/rooms', data);
    return res.data.room;
  },
  updateStatus: async (id: string, status: string, notes?: string): Promise<Room> => {
    const res = await apiClient.patch(`/rooms/${id}/status`, { status, notes });
    return res.data.room;
  },
};

export const reservationsApi = {
  getReservations: async (params?: { status?: string; search?: string; from_date?: string; to_date?: string }): Promise<Reservation[]> => {
    const res = await apiClient.get('/reservations', { params });
    return res.data.reservations ?? [];
  },
  getReservationById: async (id: string): Promise<{ reservation: Reservation; folio: GuestFolio | null }> => {
    const res = await apiClient.get(`/reservations/${id}`);
    return res.data;
  },
  createReservation: async (data: any): Promise<{ reservation: Reservation; message: string }> => {
    const res = await apiClient.post('/reservations', data);
    return res.data;
  },
  cancelReservation: async (id: string, reason?: string): Promise<{ reservation: Reservation; message: string }> => {
    const res = await apiClient.post(`/reservations/${id}/cancel`, { reason });
    return res.data;
  },
  getCalendarTimeline: async (): Promise<any[]> => {
    const res = await apiClient.get('/reservations/calendar');
    return res.data.timeline ?? [];
  },
};

export const frontdeskApi = {
  getArrivals: async (): Promise<Reservation[]> => {
    const res = await apiClient.get('/frontdesk/arrivals');
    return res.data.arrivals ?? [];
  },
  getDepartures: async (): Promise<Reservation[]> => {
    const res = await apiClient.get('/frontdesk/departures');
    return res.data.departures ?? [];
  },
  getInHouse: async (): Promise<Reservation[]> => {
    const res = await apiClient.get('/frontdesk/in-house');
    return res.data.in_house ?? [];
  },
  checkIn: async (data: { reservation_id: string; room_id?: string; deposit_amount?: number; payment_method?: string; identity_verified?: boolean; notes?: string; guest_identity?: { first_name: string; last_name: string; id_number: string; date_of_birth?: string; address?: string; nationality?: string } }) => {
    const res = await apiClient.post('/frontdesk/check-in', data);
    return res.data;
  },
  checkOut: async (data: { reservation_id: string; payment_method?: string; settle_payment: boolean; notes?: string }) => {
    const res = await apiClient.post('/frontdesk/check-out', data);
    return res.data;
  },
  transferRoom: async (data: { reservation_id: string; new_room_id: string; reason?: string }) => {
    const res = await apiClient.post('/frontdesk/transfer-room', data);
    return res.data;
  },
};

export interface ParsedNIDIdentity {
  first_name: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  address: string;
  nationality: string;
  warnings: string[];
}

export const identityApi = {
  parseNID: async (rawText: string): Promise<ParsedNIDIdentity> => {
    const res = await apiClient.post('/identity/nid/parse', { raw_text: rawText });
    return res.data.identity;
  },
};

export const guestsApi = {
  getGuests: async (params?: { search?: string; vip?: string }): Promise<Guest[]> => {
    const res = await apiClient.get('/guests', { params });
    return res.data.guests ?? [];
  },
  getGuestById: async (id: string): Promise<{ guest: Guest; reservations: Reservation[] }> => {
    const res = await apiClient.get(`/guests/${id}`);
    return { ...res.data, reservations: res.data.reservations ?? [] };
  },
  createGuest: async (data: any): Promise<Guest> => {
    const res = await apiClient.post('/guests', data);
    return res.data.guest;
  },
  updateGuest: async (id: string, data: any): Promise<Guest> => {
    const res = await apiClient.put(`/guests/${id}`, data);
    return res.data.guest;
  },
};

export const housekeepingApi = {
  getTasks: async (params?: { status?: string; priority?: string }): Promise<HousekeepingTask[]> => {
    const res = await apiClient.get('/housekeeping/tasks', { params });
    return res.data.tasks ?? [];
  },
  createTask: async (data: any): Promise<HousekeepingTask> => {
    const res = await apiClient.post('/housekeeping/tasks', data);
    return res.data.task;
  },
  updateStatus: async (id: string, data: { status: string; checklist?: string; notes?: string }) => {
    const res = await apiClient.patch(`/housekeeping/tasks/${id}/status`, data);
    return res.data;
  },
};

export const restaurantApi = {
  getTables: async (): Promise<RestaurantTable[]> => {
    const res = await apiClient.get('/restaurant/tables');
    return res.data.tables ?? [];
  },
  getMenu: async (): Promise<MenuCategory[]> => {
    const res = await apiClient.get('/restaurant/menu');
    return res.data.categories ?? [];
  },
  getOrders: async (params?: { status?: string }): Promise<RestaurantOrder[]> => {
    const res = await apiClient.get('/restaurant/orders', { params });
    return res.data.orders ?? [];
  },
  createOrder: async (data: any): Promise<RestaurantOrder> => {
    const res = await apiClient.post('/restaurant/orders', data);
    return res.data.order;
  },
  chargeToRoom: async (orderId: string, roomId: string) => {
    const res = await apiClient.post(`/restaurant/orders/${orderId}/charge-to-room`, { room_id: roomId });
    return res.data;
  },
};

export const billingApi = {
  getFolio: async (id: string): Promise<GuestFolio> => {
    const res = await apiClient.get(`/billing/folios/${id}`);
    return res.data.folio;
  },
  addCharge: async (folioId: string, data: { type: string; description: string; amount: number }) => {
    const res = await apiClient.post(`/billing/folios/${folioId}/charge`, data);
    return res.data;
  },
  recordPayment: async (data: any) => {
    const res = await apiClient.post('/billing/payments', data);
    return res.data;
  },
  getInvoices: async (params?: { status?: string }): Promise<Invoice[]> => {
    const res = await apiClient.get('/billing/invoices', { params });
    return res.data.invoices ?? [];
  },
  getInvoiceById: async (id: string): Promise<{ invoice: Invoice; hotel: Hotel }> => {
    const res = await apiClient.get(`/billing/invoices/${id}`);
    return res.data;
  },
};

export const inventoryApi = {
  getItems: async (params?: { category?: string; low_stock?: string }): Promise<InventoryItem[]> => {
    const res = await apiClient.get('/inventory/items', { params });
    return res.data.items ?? [];
  },
  adjustStock: async (data: { item_id: string; type: string; quantity: number; reason?: string; department?: string }) => {
    const res = await apiClient.post('/inventory/adjust', data);
    return res.data;
  },
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await apiClient.get('/procurement/suppliers');
    return res.data.suppliers ?? [];
  },
  getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
    const res = await apiClient.get('/procurement/orders');
    return res.data.purchase_orders ?? [];
  },
  createPO: async (data: any): Promise<PurchaseOrder> => {
    const res = await apiClient.post('/procurement/orders', data);
    return res.data.purchase_order;
  },
  approvePO: async (id: string) => {
    const res = await apiClient.patch(`/procurement/orders/${id}/approve`);
    return res.data;
  },
};

export const maintenanceApi = {
  getRequests: async (params?: { status?: string }): Promise<MaintenanceRequest[]> => {
    const res = await apiClient.get('/maintenance', { params });
    return res.data.requests ?? [];
  },
  createRequest: async (data: any): Promise<MaintenanceRequest> => {
    const res = await apiClient.post('/maintenance', data);
    return res.data.request;
  },
  updateStatus: async (id: string, data: { status: string; cost?: number; release_room?: boolean }) => {
    const res = await apiClient.patch(`/maintenance/${id}/status`, data);
    return res.data;
  },
};

export const employeesApi = {
  getEmployees: async (params?: { department?: string }): Promise<Employee[]> => {
    const res = await apiClient.get('/employees', { params });
    return res.data.employees ?? [];
  },
  getShifts: async (): Promise<Shift[]> => {
    const res = await apiClient.get('/employees/shifts');
    return res.data.shifts ?? [];
  },
};

export const reportsApi = {
  getDailyBusinessReport: async (date?: string) => {
    const res = await apiClient.get('/reports/daily-business', { params: { date } });
    return res.data.report;
  },
};

export const settingsApi = {
  getHotel: async (): Promise<Hotel> => {
    const res = await apiClient.get('/settings/hotel');
    return res.data.hotel;
  },
  updateHotel: async (data: any): Promise<Hotel> => {
    const res = await apiClient.put('/settings/hotel', data);
    return res.data.hotel;
  },
  getAuditLogs: async (): Promise<AuditLogItem[]> => {
    const res = await apiClient.get('/settings/audit-logs');
    return res.data.audit_logs ?? [];
  },
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await apiClient.get('/notifications');
    return res.data.notifications ?? [];
  },
  markNotificationRead: async (id: string) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },
};

