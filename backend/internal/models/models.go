package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base model with UUID primary keys
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// -------------------------------------------------------------
// HOTEL & PROPERTY MANAGEMENT
// -------------------------------------------------------------

type Hotel struct {
	BaseModel
	Name              string  `gorm:"size:255;not null" json:"name"`
	Code              string  `gorm:"size:50;unique;not null" json:"code"`
	Tagline           string  `gorm:"size:255" json:"tagline"`
	Description       string  `gorm:"type:text" json:"description"`
	Address           string  `gorm:"size:255" json:"address"`
	City              string  `gorm:"size:100" json:"city"`
	Country           string  `gorm:"size:100" json:"country"`
	Phone             string  `gorm:"size:50" json:"phone"`
	Email             string  `gorm:"size:100" json:"email"`
	Website           string  `gorm:"size:255" json:"website"`
	Currency          string  `gorm:"size:10;default:'BDT'" json:"currency"`
	TaxRate           float64 `gorm:"type:decimal(5,2);default:15.0" json:"tax_rate"` // e.g. 15%
	ServiceChargeRate float64 `gorm:"type:decimal(5,2);default:10.0" json:"service_charge_rate"`
	CheckInTime       string  `gorm:"size:10;default:'14:00'" json:"check_in_time"`
	CheckOutTime      string  `gorm:"size:10;default:'11:00'" json:"check_out_time"`
	LogoURL           string  `gorm:"size:255" json:"logo_url"`

	Properties []Property `gorm:"foreignKey:HotelID" json:"properties,omitempty"`
}

type Property struct {
	BaseModel
	HotelID     uuid.UUID `gorm:"type:uuid;not null;index" json:"hotel_id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Code        string    `gorm:"size:50;not null" json:"code"`
	Address     string    `gorm:"size:255" json:"address"`
	TotalFloors int       `gorm:"default:1" json:"total_floors"`
	TotalRooms  int       `gorm:"default:0" json:"total_rooms"`

	Floors    []Floor    `gorm:"foreignKey:PropertyID" json:"floors,omitempty"`
	RoomTypes []RoomType `gorm:"foreignKey:PropertyID" json:"room_types,omitempty"`
	Rooms     []Room     `gorm:"foreignKey:PropertyID" json:"rooms,omitempty"`
}

type Floor struct {
	BaseModel
	PropertyID  uuid.UUID `gorm:"type:uuid;not null;index" json:"property_id"`
	FloorNumber int       `gorm:"not null" json:"floor_number"`
	Name        string    `gorm:"size:100" json:"name"`

	Rooms []Room `gorm:"foreignKey:FloorID" json:"rooms,omitempty"`
}

type RoomType struct {
	BaseModel
	PropertyID       uuid.UUID `gorm:"type:uuid;not null;index" json:"property_id"`
	Name             string    `gorm:"size:100;not null" json:"name"`
	Code             string    `gorm:"size:50;not null" json:"code"`
	Description      string    `gorm:"type:text" json:"description"`
	BasePrice        float64   `gorm:"type:decimal(12,2);not null" json:"base_price"`
	WeekendPrice     float64   `gorm:"type:decimal(12,2)" json:"weekend_price"`
	CapacityAdults   int       `gorm:"default:2" json:"capacity_adults"`
	CapacityChildren int       `gorm:"default:1" json:"capacity_children"`
	MaxOccupancy     int       `gorm:"default:3" json:"max_occupancy"`
	BedType          string    `gorm:"size:50;default:'King'" json:"bed_type"`
	SizeSqm          float64   `gorm:"type:decimal(6,2)" json:"size_sqm"`
	Amenities        string    `gorm:"type:text" json:"amenities"` // Comma-separated or JSON
	ImageURL         string    `gorm:"size:255" json:"image_url"`

	Rooms []Room `gorm:"foreignKey:RoomTypeID" json:"rooms,omitempty"`
}

type RoomStatus string

const (
	RoomStatusAvailable   RoomStatus = "available"
	RoomStatusReserved    RoomStatus = "reserved"
	RoomStatusOccupied    RoomStatus = "occupied"
	RoomStatusDirty       RoomStatus = "dirty"
	RoomStatusCleaning    RoomStatus = "cleaning"
	RoomStatusInspected   RoomStatus = "inspected"
	RoomStatusMaintenance RoomStatus = "maintenance"
	RoomStatusOutOfOrder  RoomStatus = "out_of_order"
)

type Room struct {
	BaseModel
	PropertyID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"property_id"`
	FloorID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"floor_id"`
	RoomTypeID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"room_type_id"`
	RoomNumber   string     `gorm:"size:50;not null;index" json:"room_number"`
	Status       RoomStatus `gorm:"size:30;default:'available';index" json:"status"`
	IsSmoking    bool       `gorm:"default:false" json:"is_smoking"`
	IsAccessible bool       `gorm:"default:false" json:"is_accessible"`
	KeyCardCode  string     `gorm:"size:50" json:"key_card_code"`
	Notes        string     `gorm:"type:text" json:"notes"`

	Floor    *Floor    `gorm:"foreignKey:FloorID" json:"floor,omitempty"`
	RoomType *RoomType `gorm:"foreignKey:RoomTypeID" json:"room_type,omitempty"`
}

// -------------------------------------------------------------
// GUEST MANAGEMENT / CRM
// -------------------------------------------------------------

type VIPStatus string

const (
	VIPNone     VIPStatus = "none"
	VIPSilver   VIPStatus = "silver"
	VIPGold     VIPStatus = "gold"
	VIPPlatinum VIPStatus = "platinum"
)

type Guest struct {
	BaseModel
	HotelID       uuid.UUID `gorm:"type:uuid;not null;index" json:"hotel_id"`
	FirstName     string    `gorm:"size:100;not null;index" json:"first_name"`
	LastName      string    `gorm:"size:100;not null;index" json:"last_name"`
	Email         string    `gorm:"size:100;index" json:"email"`
	Phone         string    `gorm:"size:50;index" json:"phone"`
	IDType        string    `gorm:"size:50;default:'National ID'" json:"id_type"` // Passport, National ID, Driver's License
	IDNumber      string    `gorm:"size:100" json:"id_number"`
	Nationality   string    `gorm:"size:100;default:'Bangladeshi'" json:"nationality"`
	Address       string    `gorm:"size:255" json:"address"`
	City          string    `gorm:"size:100" json:"city"`
	Country       string    `gorm:"size:100;default:'Bangladesh'" json:"country"`
	VIPStatus     VIPStatus `gorm:"size:20;default:'none'" json:"vip_status"`
	LoyaltyPoints int       `gorm:"default:0" json:"loyalty_points"`
	TotalStays    int       `gorm:"default:0" json:"total_stays"`
	TotalSpent    float64   `gorm:"type:decimal(14,2);default:0" json:"total_spent"`
	Preferences   string    `gorm:"type:text" json:"preferences"`
	Notes         string    `gorm:"type:text" json:"notes"`
	CompanyName   string    `gorm:"size:150" json:"company_name"`
}

// -------------------------------------------------------------
// RESERVATIONS & BOOKING ENGINE
// -------------------------------------------------------------

type ReservationStatus string

const (
	ResPending    ReservationStatus = "pending"
	ResConfirmed  ReservationStatus = "confirmed"
	ResCheckedIn  ReservationStatus = "checked_in"
	ResCheckedOut ReservationStatus = "checked_out"
	ResCancelled  ReservationStatus = "cancelled"
	ResNoShow     ReservationStatus = "no_show"
)

type BookingSource string

const (
	SourceDirect      BookingSource = "direct"
	SourceWalkIn      BookingSource = "walk_in"
	SourceTelephone   BookingSource = "telephone"
	SourceWebsite     BookingSource = "website"
	SourceOTA         BookingSource = "ota"
	SourceCorporate   BookingSource = "corporate"
	SourceTravelAgent BookingSource = "travel_agent"
)

type RatePlan struct {
	BaseModel
	HotelID                 uuid.UUID `gorm:"type:uuid;not null;index" json:"hotel_id"`
	Name                    string    `gorm:"size:100;not null" json:"name"`
	Code                    string    `gorm:"size:50;not null" json:"code"`
	Description             string    `gorm:"type:text" json:"description"`
	MealPlan                string    `gorm:"size:50;default:'Room Only'" json:"meal_plan"` // Room Only, Bed & Breakfast, Half Board, Full Board
	PriceModifierPercentage float64   `gorm:"type:decimal(5,2);default:0" json:"price_modifier_percentage"`
	IsRefundable            bool      `gorm:"default:true" json:"is_refundable"`
	CancellationHours       int       `gorm:"default:24" json:"cancellation_hours"`
}

type Reservation struct {
	BaseModel
	HotelID            uuid.UUID         `gorm:"type:uuid;not null;index" json:"hotel_id"`
	PropertyID         uuid.UUID         `gorm:"type:uuid;not null;index" json:"property_id"`
	ReservationNumber  string            `gorm:"size:50;unique;not null;index" json:"reservation_number"`
	GuestID            uuid.UUID         `gorm:"type:uuid;not null;index" json:"guest_id"`
	RoomID             *uuid.UUID        `gorm:"type:uuid;index" json:"room_id"` // can be nil before room assignment
	RoomTypeID         uuid.UUID         `gorm:"type:uuid;not null;index" json:"room_type_id"`
	RatePlanID         *uuid.UUID        `gorm:"type:uuid" json:"rate_plan_id"`
	CheckInDate        time.Time         `gorm:"type:date;not null;index" json:"check_in_date"`
	CheckOutDate       time.Time         `gorm:"type:date;not null;index" json:"check_out_date"`
	Nights             int               `gorm:"not null" json:"nights"`
	Adults             int               `gorm:"default:1" json:"adults"`
	Children           int               `gorm:"default:0" json:"children"`
	BookingSource      BookingSource     `gorm:"size:50;default:'direct'" json:"booking_source"`
	Status             ReservationStatus `gorm:"size:30;default:'confirmed';index" json:"status"`
	BaseRate           float64           `gorm:"type:decimal(12,2);not null" json:"base_rate"`
	TaxAmount          float64           `gorm:"type:decimal(12,2);default:0" json:"tax_amount"`
	ServiceCharge      float64           `gorm:"type:decimal(12,2);default:0" json:"service_charge"`
	DiscountAmount     float64           `gorm:"type:decimal(12,2);default:0" json:"discount_amount"`
	TotalAmount        float64           `gorm:"type:decimal(12,2);not null" json:"total_amount"`
	PaidAmount         float64           `gorm:"type:decimal(12,2);default:0" json:"paid_amount"`
	SpecialRequests    string            `gorm:"type:text" json:"special_requests"`
	Notes              string            `gorm:"type:text" json:"notes"`
	CancelledAt        *time.Time        `json:"cancelled_at"`
	CancellationReason string            `gorm:"size:255" json:"cancellation_reason"`

	Guest    *Guest    `gorm:"foreignKey:GuestID" json:"guest,omitempty"`
	Room     *Room     `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	RoomType *RoomType `gorm:"foreignKey:RoomTypeID" json:"room_type,omitempty"`
	RatePlan *RatePlan `gorm:"foreignKey:RatePlanID" json:"rate_plan,omitempty"`
}

// -------------------------------------------------------------
// FRONT DESK, FOLIOS & BILLING
// -------------------------------------------------------------

type FolioStatus string

const (
	FolioOpen    FolioStatus = "open"
	FolioSettled FolioStatus = "settled"
	FolioClosed  FolioStatus = "closed"
)

type GuestFolio struct {
	BaseModel
	ReservationID uuid.UUID   `gorm:"type:uuid;not null;index" json:"reservation_id"`
	GuestID       uuid.UUID   `gorm:"type:uuid;not null;index" json:"guest_id"`
	RoomID        *uuid.UUID  `gorm:"type:uuid;index" json:"room_id"`
	Status        FolioStatus `gorm:"size:20;default:'open';index" json:"status"`
	TotalCharges  float64     `gorm:"type:decimal(12,2);default:0" json:"total_charges"`
	TotalPayments float64     `gorm:"type:decimal(12,2);default:0" json:"total_payments"`
	Balance       float64     `gorm:"type:decimal(12,2);default:0" json:"balance"`

	Reservation  *Reservation       `gorm:"foreignKey:ReservationID" json:"reservation,omitempty"`
	Guest        *Guest             `gorm:"foreignKey:GuestID" json:"guest,omitempty"`
	Room         *Room              `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Transactions []FolioTransaction `gorm:"foreignKey:FolioID" json:"transactions,omitempty"`
}

type TransactionType string

const (
	TxRoomCharge    TransactionType = "room_charge"
	TxRestaurant    TransactionType = "restaurant"
	TxPOS           TransactionType = "pos"
	TxLaundry       TransactionType = "laundry"
	TxMinibar       TransactionType = "minibar"
	TxTax           TransactionType = "tax"
	TxServiceCharge TransactionType = "service_charge"
	TxDiscount      TransactionType = "discount"
	TxPayment       TransactionType = "payment"
	TxRefund        TransactionType = "refund"
)

type FolioTransaction struct {
	BaseModel
	FolioID          uuid.UUID       `gorm:"type:uuid;not null;index" json:"folio_id"`
	Type             TransactionType `gorm:"size:30;not null" json:"type"`
	Description      string          `gorm:"size:255;not null" json:"description"`
	ReferenceID      string          `gorm:"size:100" json:"reference_id"` // e.g. Order ID, payment ref
	Amount           float64         `gorm:"type:decimal(12,2);not null" json:"amount"`
	IsCredit         bool            `gorm:"default:false" json:"is_credit"` // true if payment/refund
	RecordedByUserID *uuid.UUID      `gorm:"type:uuid" json:"recorded_by_user_id"`
}

type InvoiceStatus string

const (
	InvoiceIssued        InvoiceStatus = "issued"
	InvoicePaid          InvoiceStatus = "paid"
	InvoicePartiallyPaid InvoiceStatus = "partially_paid"
	InvoiceVoid          InvoiceStatus = "void"
)

type Invoice struct {
	BaseModel
	InvoiceNumber  string        `gorm:"size:50;unique;not null;index" json:"invoice_number"`
	FolioID        uuid.UUID     `gorm:"type:uuid;not null;index" json:"folio_id"`
	ReservationID  uuid.UUID     `gorm:"type:uuid;not null;index" json:"reservation_id"`
	GuestID        uuid.UUID     `gorm:"type:uuid;not null;index" json:"guest_id"`
	Subtotal       float64       `gorm:"type:decimal(12,2);not null" json:"subtotal"`
	TaxAmount      float64       `gorm:"type:decimal(12,2);default:0" json:"tax_amount"`
	ServiceCharge  float64       `gorm:"type:decimal(12,2);default:0" json:"service_charge"`
	DiscountAmount float64       `gorm:"type:decimal(12,2);default:0" json:"discount_amount"`
	GrandTotal     float64       `gorm:"type:decimal(12,2);not null" json:"grand_total"`
	PaidAmount     float64       `gorm:"type:decimal(12,2);default:0" json:"paid_amount"`
	Status         InvoiceStatus `gorm:"size:30;default:'issued';index" json:"status"`
	Notes          string        `gorm:"type:text" json:"notes"`
	DueDate        time.Time     `json:"due_date"`

	Guest       *Guest       `gorm:"foreignKey:GuestID" json:"guest,omitempty"`
	Reservation *Reservation `gorm:"foreignKey:ReservationID" json:"reservation,omitempty"`
	Payments    []Payment    `gorm:"foreignKey:InvoiceID" json:"payments,omitempty"`
}

type PaymentMethod string

const (
	PayMethodCash         PaymentMethod = "cash"
	PayMethodDebitCard    PaymentMethod = "debit_card"
	PayMethodCreditCard   PaymentMethod = "credit_card"
	PayMethodBankTransfer PaymentMethod = "bank_transfer"
	PayMethodBkash        PaymentMethod = "bkash"
	PayMethodNagad        PaymentMethod = "nagad"
)

type PaymentStatus string

const (
	PaymentCompleted PaymentStatus = "completed"
	PaymentRefunded  PaymentStatus = "refunded"
	PaymentFailed    PaymentStatus = "failed"
)

type Payment struct {
	BaseModel
	PaymentNumber    string        `gorm:"size:50;unique;not null;index" json:"payment_number"`
	FolioID          *uuid.UUID    `gorm:"type:uuid;index" json:"folio_id"`
	InvoiceID        *uuid.UUID    `gorm:"type:uuid;index" json:"invoice_id"`
	GuestID          uuid.UUID     `gorm:"type:uuid;not null;index" json:"guest_id"`
	Amount           float64       `gorm:"type:decimal(12,2);not null" json:"amount"`
	PaymentMethod    PaymentMethod `gorm:"size:50;not null" json:"payment_method"`
	TransactionRef   string        `gorm:"size:100" json:"transaction_ref"`
	Status           PaymentStatus `gorm:"size:30;default:'completed'" json:"status"`
	ReceivedByUserID *uuid.UUID    `gorm:"type:uuid" json:"received_by_user_id"`
	Notes            string        `gorm:"type:text" json:"notes"`
}

// -------------------------------------------------------------
// HOUSEKEEPING
// -------------------------------------------------------------

type HousekeepingTaskType string

const (
	HKDailyCleaning    HousekeepingTaskType = "daily_cleaning"
	HKCheckoutTurnover HousekeepingTaskType = "checkout_turnover"
	HKDeepClean        HousekeepingTaskType = "deep_clean"
	HKTurndown         HousekeepingTaskType = "turndown"
)

type PriorityLevel string

const (
	PriorityLow       PriorityLevel = "low"
	PriorityMedium    PriorityLevel = "medium"
	PriorityHigh      PriorityLevel = "high"
	PriorityUrgent    PriorityLevel = "urgent"
	PriorityEmergency PriorityLevel = "emergency"
)

type HousekeepingTask struct {
	BaseModel
	RoomID           uuid.UUID            `gorm:"type:uuid;not null;index" json:"room_id"`
	AssignedToUserID *uuid.UUID           `gorm:"type:uuid;index" json:"assigned_to_user_id"`
	TaskType         HousekeepingTaskType `gorm:"size:50;not null" json:"task_type"`
	Priority         PriorityLevel        `gorm:"size:30;default:'medium'" json:"priority"`
	Status           RoomStatus           `gorm:"size:30;default:'dirty';index" json:"status"` // dirty -> cleaning -> inspected -> available
	Checklist        string               `gorm:"type:text" json:"checklist"`                  // JSON array of checked tasks
	StartedAt        *time.Time           `json:"started_at"`
	CompletedAt      *time.Time           `json:"completed_at"`
	Notes            string               `gorm:"type:text" json:"notes"`

	Room     *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Assignee *User `gorm:"foreignKey:AssignedToUserID" json:"assignee,omitempty"`
}

// -------------------------------------------------------------
// RESTAURANT & POS
// -------------------------------------------------------------

type RestaurantTable struct {
	BaseModel
	TableNumber string `gorm:"size:50;not null" json:"table_number"`
	Capacity    int    `gorm:"default:4" json:"capacity"`
	Location    string `gorm:"size:50;default:'indoor'" json:"location"`  // indoor, terrace, patio, lounge
	Status      string `gorm:"size:30;default:'available'" json:"status"` // available, occupied, reserved
}

type MenuCategory struct {
	BaseModel
	Name         string `gorm:"size:100;not null" json:"name"`
	Code         string `gorm:"size:50;not null" json:"code"`
	Icon         string `gorm:"size:50" json:"icon"`
	DisplayOrder int    `gorm:"default:0" json:"display_order"`
	IsActive     bool   `gorm:"default:true" json:"is_active"`

	MenuItems []MenuItem `gorm:"foreignKey:CategoryID" json:"menu_items,omitempty"`
}

type MenuItem struct {
	BaseModel
	CategoryID    uuid.UUID `gorm:"type:uuid;not null;index" json:"category_id"`
	Name          string    `gorm:"size:150;not null" json:"name"`
	Description   string    `gorm:"type:text" json:"description"`
	Price         float64   `gorm:"type:decimal(12,2);not null" json:"price"`
	TaxPercentage float64   `gorm:"type:decimal(5,2);default:10.0" json:"tax_percentage"`
	IsAvailable   bool      `gorm:"default:true" json:"is_available"`
	ImageURL      string    `gorm:"size:255" json:"image_url"`

	Category *MenuCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type OrderType string

const (
	OrderDineIn      OrderType = "dine_in"
	OrderTakeaway    OrderType = "takeaway"
	OrderRoomService OrderType = "room_service"
)

type OrderStatus string

const (
	OrderPlaced        OrderStatus = "placed"
	OrderPreparing     OrderStatus = "preparing"
	OrderReady         OrderStatus = "ready"
	OrderServed        OrderStatus = "served"
	OrderPaid          OrderStatus = "paid"
	OrderChargedToRoom OrderStatus = "charged_to_room"
	OrderCancelled     OrderStatus = "cancelled"
)

type RestaurantOrder struct {
	BaseModel
	OrderNumber  string      `gorm:"size:50;unique;not null;index" json:"order_number"`
	OrderType    OrderType   `gorm:"size:30;not null" json:"order_type"`
	TableID      *uuid.UUID  `gorm:"type:uuid;index" json:"table_id"`
	RoomID       *uuid.UUID  `gorm:"type:uuid;index" json:"room_id"`
	GuestFolioID *uuid.UUID  `gorm:"type:uuid;index" json:"guest_folio_id"`
	Status       OrderStatus `gorm:"size:30;default:'placed';index" json:"status"`
	Subtotal     float64     `gorm:"type:decimal(12,2);not null" json:"subtotal"`
	Tax          float64     `gorm:"type:decimal(12,2);default:0" json:"tax"`
	Total        float64     `gorm:"type:decimal(12,2);not null" json:"total"`
	ServerUserID *uuid.UUID  `gorm:"type:uuid" json:"server_user_id"`
	Notes        string      `gorm:"type:text" json:"notes"`

	Table *RestaurantTable      `gorm:"foreignKey:TableID" json:"table,omitempty"`
	Room  *Room                 `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Items []RestaurantOrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
}

type RestaurantOrderItem struct {
	BaseModel
	OrderID    uuid.UUID `gorm:"type:uuid;not null;index" json:"order_id"`
	MenuItemID uuid.UUID `gorm:"type:uuid;not null;index" json:"menu_item_id"`
	ItemName   string    `gorm:"size:150;not null" json:"item_name"`
	UnitPrice  float64   `gorm:"type:decimal(12,2);not null" json:"unit_price"`
	Quantity   int       `gorm:"not null;default:1" json:"quantity"`
	TotalPrice float64   `gorm:"type:decimal(12,2);not null" json:"total_price"`
	Notes      string    `gorm:"size:255" json:"notes"`
}

// -------------------------------------------------------------
// INVENTORY & PROCUREMENT
// -------------------------------------------------------------

type InventoryItem struct {
	BaseModel
	Category        string     `gorm:"size:100;not null;index" json:"category"` // Housekeeping, F&B, Linen, Maintenance
	SKU             string     `gorm:"size:50;unique;not null;index" json:"sku"`
	Name            string     `gorm:"size:150;not null" json:"name"`
	Unit            string     `gorm:"size:30;default:'pcs'" json:"unit"` // pcs, kg, liters, boxes
	CurrentStock    int        `gorm:"not null;default:0" json:"current_stock"`
	MinimumStock    int        `gorm:"not null;default:10" json:"minimum_stock"`
	ReorderQuantity int        `gorm:"not null;default:50" json:"reorder_quantity"`
	CostPerUnit     float64    `gorm:"type:decimal(12,2);default:0" json:"cost_per_unit"`
	SupplierID      *uuid.UUID `gorm:"type:uuid" json:"supplier_id"`
	LastRestockedAt *time.Time `json:"last_restocked_at"`

	Supplier *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
}

type InventoryMovementType string

const (
	MovementReceived   InventoryMovementType = "received"
	MovementConsumed   InventoryMovementType = "consumed"
	MovementDamaged    InventoryMovementType = "damaged"
	MovementAdjustment InventoryMovementType = "adjustment"
	MovementTransfer   InventoryMovementType = "transfer"
)

type InventoryMovement struct {
	BaseModel
	ItemID           uuid.UUID             `gorm:"type:uuid;not null;index" json:"item_id"`
	Type             InventoryMovementType `gorm:"size:30;not null" json:"type"`
	Quantity         int                   `gorm:"not null" json:"quantity"`
	Reason           string                `gorm:"size:255" json:"reason"`
	Department       string                `gorm:"size:100" json:"department"`
	RecordedByUserID *uuid.UUID            `gorm:"type:uuid" json:"recorded_by_user_id"`

	Item *InventoryItem `gorm:"foreignKey:ItemID" json:"item,omitempty"`
}

type Supplier struct {
	BaseModel
	Name          string `gorm:"size:150;not null" json:"name"`
	ContactPerson string `gorm:"size:100" json:"contact_person"`
	Email         string `gorm:"size:100" json:"email"`
	Phone         string `gorm:"size:50" json:"phone"`
	Address       string `gorm:"size:255" json:"address"`
	TaxNumber     string `gorm:"size:50" json:"tax_number"`
}

type PurchaseOrderStatus string

const (
	PODraft           PurchaseOrderStatus = "draft"
	POPendingApproval PurchaseOrderStatus = "pending_approval"
	POApproved        PurchaseOrderStatus = "approved"
	POOrdered         PurchaseOrderStatus = "ordered"
	POReceived        PurchaseOrderStatus = "received"
	POCancelled       PurchaseOrderStatus = "cancelled"
)

type PurchaseOrder struct {
	BaseModel
	PONumber             string              `gorm:"size:50;unique;not null;index" json:"po_number"`
	SupplierID           uuid.UUID           `gorm:"type:uuid;not null;index" json:"supplier_id"`
	Status               PurchaseOrderStatus `gorm:"size:30;default:'draft';index" json:"status"`
	TotalAmount          float64             `gorm:"type:decimal(12,2);not null" json:"total_amount"`
	RequestedByUserID    *uuid.UUID          `gorm:"type:uuid" json:"requested_by_user_id"`
	ApprovedByUserID     *uuid.UUID          `gorm:"type:uuid" json:"approved_by_user_id"`
	ExpectedDeliveryDate *time.Time          `json:"expected_delivery_date"`

	Supplier *Supplier           `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Items    []PurchaseOrderItem `gorm:"foreignKey:POID" json:"items,omitempty"`
}

type PurchaseOrderItem struct {
	BaseModel
	POID       uuid.UUID `gorm:"type:uuid;not null;index" json:"po_id"`
	ItemName   string    `gorm:"size:150;not null" json:"item_name"`
	Quantity   int       `gorm:"not null" json:"quantity"`
	UnitPrice  float64   `gorm:"type:decimal(12,2);not null" json:"unit_price"`
	TotalPrice float64   `gorm:"type:decimal(12,2);not null" json:"total_price"`
}

// -------------------------------------------------------------
// MAINTENANCE
// -------------------------------------------------------------

type MaintenanceStatus string

const (
	MaintReported   MaintenanceStatus = "reported"
	MaintInProgress MaintenanceStatus = "in_progress"
	MaintOnHold     MaintenanceStatus = "on_hold"
	MaintCompleted  MaintenanceStatus = "completed"
)

type MaintenanceRequest struct {
	BaseModel
	RoomID           *uuid.UUID        `gorm:"type:uuid;index" json:"room_id"`
	EquipmentName    string            `gorm:"size:100" json:"equipment_name"`
	Title            string            `gorm:"size:150;not null" json:"title"`
	Description      string            `gorm:"type:text" json:"description"`
	Priority         PriorityLevel     `gorm:"size:30;default:'medium'" json:"priority"`
	Status           MaintenanceStatus `gorm:"size:30;default:'reported';index" json:"status"`
	AssignedToUserID *uuid.UUID        `gorm:"type:uuid;index" json:"assigned_to_user_id"`
	ReportedByUserID *uuid.UUID        `gorm:"type:uuid" json:"reported_by_user_id"`
	Cost             float64           `gorm:"type:decimal(12,2);default:0" json:"cost"`
	CompletedAt      *time.Time        `json:"completed_at"`

	Room     *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Assignee *User `gorm:"foreignKey:AssignedToUserID" json:"assignee,omitempty"`
}

// -------------------------------------------------------------
// EMPLOYEES & HR
// -------------------------------------------------------------

type Employee struct {
	BaseModel
	EmployeeCode string     `gorm:"size:50;unique;not null;index" json:"employee_code"`
	UserID       *uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	FirstName    string     `gorm:"size:100;not null" json:"first_name"`
	LastName     string     `gorm:"size:100;not null" json:"last_name"`
	Department   string     `gorm:"size:100;not null" json:"department"` // Front Desk, Housekeeping, F&B, Maintenance, Accounts, Management
	Designation  string     `gorm:"size:100;not null" json:"designation"`
	Phone        string     `gorm:"size:50" json:"phone"`
	Email        string     `gorm:"size:100" json:"email"`
	HireDate     time.Time  `gorm:"type:date;not null" json:"hire_date"`
	Salary       float64    `gorm:"type:decimal(12,2);not null" json:"salary"`
	Status       string     `gorm:"size:30;default:'active'" json:"status"` // active, on_leave, terminated

	Shifts []Shift `gorm:"foreignKey:EmployeeID" json:"shifts,omitempty"`
}

type Shift struct {
	BaseModel
	EmployeeID uuid.UUID `gorm:"type:uuid;not null;index" json:"employee_id"`
	ShiftName  string    `gorm:"size:100;not null" json:"shift_name"` // Morning, Evening, Night
	Date       time.Time `gorm:"type:date;not null;index" json:"date"`
	StartTime  string    `gorm:"size:10;not null" json:"start_time"`
	EndTime    string    `gorm:"size:10;not null" json:"end_time"`
	Status     string    `gorm:"size:30;default:'scheduled'" json:"status"` // scheduled, present, absent, late

	Employee *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

// -------------------------------------------------------------
// USERS, RBAC, AUDIT & NOTIFICATIONS
// -------------------------------------------------------------

type UserRole string

const (
	RoleSuperAdmin        UserRole = "super_admin"
	RoleHotelOwner        UserRole = "hotel_owner"
	RoleGeneralManager    UserRole = "general_manager"
	RoleHotelManager      UserRole = "hotel_manager"
	RoleReceptionist      UserRole = "receptionist"
	RoleHousekeepingStaff UserRole = "housekeeping_staff"
	RoleAccountant        UserRole = "accountant"
	RoleRestaurantManager UserRole = "restaurant_manager"
	RoleRestaurantStaff   UserRole = "restaurant_staff"
	RoleInventoryManager  UserRole = "inventory_manager"
	RoleMaintenanceStaff  UserRole = "maintenance_staff"
)

type User struct {
	BaseModel
	HotelID             *uuid.UUID `gorm:"type:uuid;index" json:"hotel_id"`
	Username            string     `gorm:"size:100;unique;not null;index" json:"username"`
	Email               string     `gorm:"size:100;unique;not null;index" json:"email"`
	PasswordHash        string     `gorm:"size:255;not null" json:"-"`
	FirstName           string     `gorm:"size:100;not null" json:"first_name"`
	LastName            string     `gorm:"size:100;not null" json:"last_name"`
	Role                UserRole   `gorm:"size:50;not null;default:'receptionist';index" json:"role"`
	IsActive            bool       `gorm:"default:true" json:"is_active"`
	LastLoginAt         *time.Time `json:"last_login_at"`
	PasswordChangedAt   *time.Time `json:"-"`
	FailedLoginAttempts int        `gorm:"default:0" json:"-"`
	LockedUntil         *time.Time `json:"-"`
}

type AuditLog struct {
	BaseModel
	UserID     *uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Action     string     `gorm:"size:100;not null" json:"action"`            // create, update, delete, check_in, check_out, payment
	EntityType string     `gorm:"size:100;not null;index" json:"entity_type"` // reservation, room, folio, payment, etc.
	EntityID   string     `gorm:"size:100;not null" json:"entity_id"`
	Details    string     `gorm:"type:text" json:"details"`
	IPAddress  string     `gorm:"size:50" json:"ip_address"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type Notification struct {
	BaseModel
	UserID  *uuid.UUID `gorm:"type:uuid;index" json:"user_id"` // null for broadcast to all staff
	Title   string     `gorm:"size:150;not null" json:"title"`
	Message string     `gorm:"type:text;not null" json:"message"`
	Type    string     `gorm:"size:50;default:'info'" json:"type"` // info, success, warning, error
	Link    string     `gorm:"size:255" json:"link"`
	IsRead  bool       `gorm:"default:false;index" json:"is_read"`
}
