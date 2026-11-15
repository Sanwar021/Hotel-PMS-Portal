export type RoomStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'dirty'
  | 'cleaning'
  | 'inspected'
  | 'maintenance'
  | 'out_of_order';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type VIPStatus = 'none' | 'silver' | 'gold' | 'platinum';

export type UserRole =
  | 'super_admin'
  | 'hotel_owner'
  | 'general_manager'
  | 'hotel_manager'
  | 'receptionist'
  | 'housekeeping_staff'
  | 'accountant'
  | 'restaurant_manager'
  | 'restaurant_staff'
  | 'inventory_manager'
  | 'maintenance_staff';

export interface User {
  id: string;
  hotel_id?: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  code: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  tax_rate: number;
  service_charge_rate: number;
  check_in_time: string;
  check_out_time: string;
}

export interface Floor {
  id: string;
  property_id: string;
  floor_number: number;
  name: string;
}

export interface RoomType {
  id: string;
  name: string;
  code: string;
  description: string;
  base_price: number;
  weekend_price: number;
  capacity_adults: number;
  capacity_children: number;
  max_occupancy: number;
  bed_type: string;
  size_sqm: number;
  amenities: string;
  image_url: string;
}

export interface Room {
  id: string;
  property_id: string;
  floor_id: string;
  room_type_id: string;
  room_number: string;
  status: RoomStatus;
  is_smoking: boolean;
  is_accessible: boolean;
  key_card_code: string;
  notes: string;
  floor?: Floor;
  room_type?: RoomType;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_type: string;
  id_number: string;
  nationality: string;
  address: string;
  city: string;
  country: string;
  vip_status: VIPStatus;
  loyalty_points: number;
  total_stays: number;
  total_spent: number;
  preferences: string;
  notes: string;
  company_name: string;
}

export interface RatePlan {
  id: string;
  name: string;
  code: string;
  description: string;
  meal_plan: string;
  price_modifier_percentage: number;
  is_refundable: boolean;
  cancellation_hours: number;
}

export interface Reservation {
  id: string;
  reservation_number: string;
  guest_id: string;
  room_id?: string;
  room_type_id: string;
  rate_plan_id?: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  booking_source: string;
  status: ReservationStatus;
  base_rate: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  paid_amount: number;
  special_requests: string;
  notes: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  guest?: Guest;
  room?: Room;
  room_type?: RoomType;
  rate_plan?: RatePlan;
}

export interface FolioTransaction {
  id: string;
  folio_id: string;
  type: string;
  description: string;
  reference_id?: string;
  amount: number;
  is_credit: boolean;
  created_at: string;
}

export interface GuestFolio {
  id: string;
  reservation_id: string;
  guest_id: string;
  room_id?: string;
  status: 'open' | 'settled' | 'closed';
  total_charges: number;
  total_payments: number;
  balance: number;
  transactions?: FolioTransaction[];
  guest?: Guest;
  room?: Room;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  folio_id: string;
  reservation_id: string;
  guest_id: string;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  grand_total: number;
  paid_amount: number;
  status: 'issued' | 'paid' | 'partially_paid' | 'void';
  due_date: string;
  created_at: string;
  guest?: Guest;
  reservation?: Reservation;
}

export interface HousekeepingTask {
  id: string;
  room_id: string;
  assigned_to_user_id?: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: RoomStatus;
  checklist: string;
  started_at?: string;
  completed_at?: string;
  notes: string;
  room?: Room;
  assignee?: User;
}

export interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  location: string;
  status: 'available' | 'occupied' | 'reserved';
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  code: string;
  icon: string;
  menu_items?: MenuItem[];
}

export interface RestaurantOrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes?: string;
}

export interface RestaurantOrder {
  id: string;
  order_number: string;
  order_type: 'dine_in' | 'takeaway' | 'room_service';
  table_id?: string;
  room_id?: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  created_at: string;
  table?: RestaurantTable;
  room?: Room;
  items?: RestaurantOrderItem[];
}

export interface InventoryItem {
  id: string;
  category: string;
  sku: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  reorder_quantity: number;
  cost_per_unit: number;
  last_restocked_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  supplier?: Supplier;
  items?: {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export interface MaintenanceRequest {
  id: string;
  room_id?: string;
  equipment_name: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'reported' | 'in_progress' | 'on_hold' | 'completed';
  cost: number;
  created_at: string;
  room?: Room;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  salary: number;
  status: string;
}

export interface Shift {
  id: string;
  employee_id: string;
  shift_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  employee?: Employee;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
  user?: User;
}

export interface DashboardData {
  stats: {
    total_rooms: number;
    available_rooms: number;
    occupied_rooms: number;
    reserved_rooms: number;
    dirty_rooms: number;
    maintenance_rooms: number;
    cleaning_rooms: number;
    today_check_ins: number;
    today_check_outs: number;
    current_guests: number;
    today_revenue: number;
    monthly_revenue: number;
    outstanding_balance: number;
    occupancy_percentage: number;
    adr: number;
    revpar: number;
  };
  revenue_trend: { date: string; revenue: number; rooms: number }[];
  source_breakdown: { source: string; count: number }[];
  recent_reservations: Reservation[];
  upcoming_arrivals: Reservation[];
  upcoming_departures: Reservation[];
  notifications: NotificationItem[];
}
