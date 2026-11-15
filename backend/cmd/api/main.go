package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/database"
	"hotelos/backend/internal/handlers"
	"hotelos/backend/internal/middleware"
	"hotelos/backend/internal/models"
	"hotelos/backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()
	if err := cfg.ValidateProduction(); err != nil {
		log.Fatalf("Unsafe production configuration: %v", err)
	}

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
	if cfg.SeedDemoData {
		if err := database.SeedDatabase(db); err != nil {
			log.Fatalf("Database seeding failed: %v", err)
		}
	} else if err := database.BootstrapProduction(db, cfg); err != nil {
		log.Fatalf("Production bootstrap failed: %v", err)
	}

	// 4. Initialize WebSocket Hub
	wsHub := websocket.InitHub(cfg)

	// 5. Setup Gin Router
	router := gin.Default()
	router.Use(middleware.CORSMiddleware(cfg.CORSOrigin))

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "operational",
			"system":  "HotelOS Backend API",
			"version": "1.0.0",
		})
	})

	if cfg.FrontendDistDir != "" {
		assetsDir := filepath.Join(cfg.FrontendDistDir, "assets")
		router.Static("/assets", assetsDir)
		router.NoRoute(func(c *gin.Context) {
			if c.Request.Method != http.MethodGet || strings.HasPrefix(c.Request.URL.Path, "/api/") || c.Request.URL.Path == "/ws" || c.Request.URL.Path == "/health" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
				return
			}
			indexPath := filepath.Join(cfg.FrontendDistDir, "index.html")
			if _, err := os.Stat(indexPath); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Frontend build is unavailable"})
				return
			}
			c.File(indexPath)
		})
	}

	// WebSocket Endpoint
	router.GET("/ws", func(c *gin.Context) {
		websocket.ServeWS(wsHub, cfg.JWTSecret, cfg.CORSOrigin, c)
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
		api.Use(middleware.AuditMutations())
		{
			api.GET("/auth/me", handlers.GetMeHandler)
			api.POST("/auth/change-password", handlers.ChangePassword)

			// Dashboard
			api.GET("/dashboard/stats", handlers.GetDashboardStats)

			// Rooms & Properties
			api.GET("/rooms", handlers.GetRooms)
			api.POST("/rooms", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelOwner, models.RoleGeneralManager, models.RoleHotelManager), handlers.CreateRoom)
			api.PATCH("/rooms/:id/status", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleHousekeepingStaff, models.RoleMaintenanceStaff), handlers.UpdateRoomStatus)
			api.GET("/room-types", handlers.GetRoomTypes)
			api.GET("/floors", handlers.GetFloors)

			// Reservations & Calendar
			api.GET("/reservations", handlers.GetReservations)
			api.POST("/reservations", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist), handlers.CreateReservation)
			api.GET("/reservations/:id", handlers.GetReservationByID)
			api.POST("/reservations/:id/cancel", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist), handlers.CancelReservation)
			api.GET("/reservations/calendar", handlers.GetCalendarTimeline)

			// Front Desk Operations
			api.GET("/frontdesk/arrivals", handlers.GetArrivals)
			api.GET("/frontdesk/departures", handlers.GetDepartures)
			api.GET("/frontdesk/in-house", handlers.GetInHouseGuests)
			api.POST("/frontdesk/check-in", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist), handlers.CheckInGuest)
			api.POST("/frontdesk/check-out", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.CheckOutGuest)
			api.POST("/frontdesk/transfer-room", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist), handlers.TransferRoom)

			// Guests CRM
			api.GET("/guests", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.GetGuests)
			api.GET("/guests/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.GetGuestByID)
			api.POST("/guests", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist), handlers.CreateGuest)
			api.PUT("/guests/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist), handlers.UpdateGuest)

			// Housekeeping
			api.GET("/housekeeping/tasks", handlers.GetHousekeepingTasks)
			api.POST("/housekeeping/tasks", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleHousekeepingStaff), handlers.CreateHousekeepingTask)
			api.PATCH("/housekeeping/tasks/:id/status", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleHousekeepingStaff), handlers.UpdateHousekeepingStatus)

			// Restaurant & POS
			api.GET("/restaurant/tables", handlers.GetRestaurantTables)
			api.GET("/restaurant/menu", handlers.GetRestaurantMenu)
			api.GET("/restaurant/orders", handlers.GetRestaurantOrders)
			api.POST("/restaurant/orders", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleRestaurantManager, models.RoleRestaurantStaff), handlers.CreateRestaurantOrder)
			api.POST("/restaurant/orders/:id/charge-to-room", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleRestaurantManager, models.RoleRestaurantStaff), handlers.ChargeOrderToRoom)

			// Billing, Folios & Payments
			api.GET("/billing/folios/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.GetFolioByID)
			api.POST("/billing/folios/:id/charge", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.AddFolioCharge)
			api.POST("/billing/payments", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.RecordPayment)
			api.POST("/billing/payments/:id/refund", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleAccountant), handlers.RefundPayment)
			api.GET("/billing/invoices", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.GetInvoices)
			api.GET("/billing/invoices/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleReceptionist, models.RoleAccountant), handlers.GetInvoiceByID)

			// Inventory & Procurement
			api.GET("/inventory/items", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleInventoryManager, models.RoleRestaurantManager, models.RoleHousekeepingStaff), handlers.GetInventoryItems)
			api.POST("/inventory/adjust", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleInventoryManager), handlers.AdjustInventoryStock)
			api.GET("/procurement/suppliers", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleInventoryManager), handlers.GetSuppliers)
			api.GET("/procurement/orders", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleInventoryManager), handlers.GetPurchaseOrders)
			api.POST("/procurement/orders", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager, models.RoleInventoryManager), handlers.CreatePurchaseOrder)
			api.PATCH("/procurement/orders/:id/approve", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelManager), handlers.ApprovePurchaseOrder)

			// Maintenance
			api.GET("/maintenance", handlers.GetMaintenanceRequests)
			api.POST("/maintenance", handlers.CreateMaintenance)
			api.PATCH("/maintenance/:id/status", handlers.UpdateMaintenanceStatus)

			// Employees & HR
			api.GET("/employees", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelOwner, models.RoleGeneralManager, models.RoleHotelManager), handlers.GetEmployees)
			api.GET("/employees/shifts", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelOwner, models.RoleGeneralManager, models.RoleHotelManager), handlers.GetShifts)

			// Reports & Analytics
			api.GET("/reports/daily-business", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelOwner, models.RoleGeneralManager, models.RoleHotelManager, models.RoleAccountant), handlers.GetDailyBusinessReport)

			// Settings, Audit & Notifications
			api.GET("/settings/hotel", handlers.GetHotelSettings)
			api.PUT("/settings/hotel", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelOwner, models.RoleGeneralManager), handlers.UpdateHotelSettings)
			api.GET("/settings/audit-logs", middleware.RequireRole(models.RoleSuperAdmin, models.RoleHotelOwner, models.RoleGeneralManager, models.RoleHotelManager), handlers.GetAuditLogs)
			api.GET("/notifications", handlers.GetNotifications)
			api.PATCH("/notifications/:id/read", handlers.MarkNotificationAsRead)
		}
	}

	log.Printf("HotelOS Core Backend running on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
