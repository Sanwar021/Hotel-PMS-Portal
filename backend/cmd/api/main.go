package main

import (
	"log"
	"net/http"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/database"
	"hotelos/backend/internal/handlers"
	"hotelos/backend/internal/middleware"
	"hotelos/backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// 1. Connect to PostgreSQL
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	// 2. Run Database Migrations
	if err := database.MigrateDB(db); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	// 3. Seed Database with HotelOS Grand Residence data
	if err := database.SeedDatabase(db); err != nil {
		log.Fatalf("Database seeding failed: %v", err)
	}

	// 4. Initialize WebSocket Hub
	wsHub := websocket.InitHub()

	// 5. Setup Gin Router
	router := gin.Default()
	router.Use(middleware.CORSMiddleware())

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "operational",
			"system":  "HotelOS Backend API",
			"version": "1.0.0",
		})
	})

	// WebSocket Endpoint
	router.GET("/ws", func(c *gin.Context) {
		websocket.ServeWS(wsHub, c)
	})

	// API v1
	v1 := router.Group("/api/v1")
	{
		// Authentication (Public)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/login", handlers.LoginHandler(cfg))
		}

		// Authenticated Routes
		api := v1.Group("")
		api.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			api.GET("/auth/me", handlers.GetMeHandler)

			// Dashboard
			api.GET("/dashboard/stats", handlers.GetDashboardStats)

			// Rooms & Properties
			api.GET("/rooms", handlers.GetRooms)
			api.POST("/rooms", handlers.CreateRoom)
			api.PATCH("/rooms/:id/status", handlers.UpdateRoomStatus)
			api.GET("/room-types", handlers.GetRoomTypes)
			api.GET("/floors", handlers.GetFloors)

			// Reservations & Calendar
			api.GET("/reservations", handlers.GetReservations)
			api.POST("/reservations", handlers.CreateReservation)
			api.GET("/reservations/:id", handlers.GetReservationByID)
			api.POST("/reservations/:id/cancel", handlers.CancelReservation)
			api.GET("/reservations/calendar", handlers.GetCalendarTimeline)

			// Front Desk Operations
			api.GET("/frontdesk/arrivals", handlers.GetArrivals)
			api.GET("/frontdesk/departures", handlers.GetDepartures)
			api.GET("/frontdesk/in-house", handlers.GetInHouseGuests)
			api.POST("/frontdesk/check-in", handlers.CheckInGuest)
			api.POST("/frontdesk/check-out", handlers.CheckOutGuest)
			api.POST("/frontdesk/transfer-room", handlers.TransferRoom)

			// Guests CRM
			api.GET("/guests", handlers.GetGuests)
			api.GET("/guests/:id", handlers.GetGuestByID)
			api.POST("/guests", handlers.CreateGuest)
			api.PUT("/guests/:id", handlers.UpdateGuest)

			// Housekeeping
			api.GET("/housekeeping/tasks", handlers.GetHousekeepingTasks)
			api.POST("/housekeeping/tasks", handlers.CreateHousekeepingTask)
			api.PATCH("/housekeeping/tasks/:id/status", handlers.UpdateHousekeepingStatus)

			// Restaurant & POS
			api.GET("/restaurant/tables", handlers.GetRestaurantTables)
			api.GET("/restaurant/menu", handlers.GetRestaurantMenu)
			api.GET("/restaurant/orders", handlers.GetRestaurantOrders)
			api.POST("/restaurant/orders", handlers.CreateRestaurantOrder)
			api.POST("/restaurant/orders/:id/charge-to-room", handlers.ChargeOrderToRoom)

			// Billing, Folios & Payments
			api.GET("/billing/folios/:id", handlers.GetFolioByID)
			api.POST("/billing/folios/:id/charge", handlers.AddFolioCharge)
			api.POST("/billing/payments", handlers.RecordPayment)
			api.GET("/billing/invoices", handlers.GetInvoices)
			api.GET("/billing/invoices/:id", handlers.GetInvoiceByID)

			// Inventory & Procurement
			api.GET("/inventory/items", handlers.GetInventoryItems)
			api.POST("/inventory/adjust", handlers.AdjustInventoryStock)
			api.GET("/procurement/suppliers", handlers.GetSuppliers)
			api.GET("/procurement/orders", handlers.GetPurchaseOrders)
			api.POST("/procurement/orders", handlers.CreatePurchaseOrder)
			api.PATCH("/procurement/orders/:id/approve", handlers.ApprovePurchaseOrder)

			// Maintenance
			api.GET("/maintenance", handlers.GetMaintenanceRequests)
			api.POST("/maintenance", handlers.CreateMaintenance)
			api.PATCH("/maintenance/:id/status", handlers.UpdateMaintenanceStatus)

			// Employees & HR
			api.GET("/employees", handlers.GetEmployees)
			api.GET("/employees/shifts", handlers.GetShifts)

			// Reports & Analytics
			api.GET("/reports/daily-business", handlers.GetDailyBusinessReport)

			// Settings, Audit & Notifications
			api.GET("/settings/hotel", handlers.GetHotelSettings)
			api.PUT("/settings/hotel", handlers.UpdateHotelSettings)
			api.GET("/settings/audit-logs", handlers.GetAuditLogs)
			api.GET("/notifications", handlers.GetNotifications)
			api.PATCH("/notifications/:id/read", handlers.MarkNotificationAsRead)
		}
	}

	log.Printf("HotelOS Core Backend running on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}

