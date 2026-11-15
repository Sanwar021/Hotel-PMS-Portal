package handlers

import (
	"fmt"
	"net/http"
	"time"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"
	"hotelos/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetRestaurantTables(c *gin.Context) {
	var tables []models.RestaurantTable
	if err := database.DB.Order("table_number asc").Find(&tables).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tables"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tables": tables})
}

func GetRestaurantMenu(c *gin.Context) {
	var categories []models.MenuCategory
	if err := database.DB.Preload("MenuItems", "is_available = ?", true).
		Order("display_order asc").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch menu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

type OrderItemRequest struct {
	MenuItemID uuid.UUID `json:"menu_item_id" binding:"required"`
	Quantity   int       `json:"quantity" binding:"required"`
	Notes      string    `json:"notes"`
}

type CreateOrderRequest struct {
	OrderType models.OrderType   `json:"order_type" binding:"required"` // dine_in, takeaway, room_service
	TableID   *uuid.UUID         `json:"table_id"`
	RoomID    *uuid.UUID         `json:"room_id"`
	Items     []OrderItemRequest `json:"items" binding:"required"`
	Notes     string             `json:"notes"`
}

func CreateRestaurantOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order must have at least one item"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var subtotal float64
	var orderItems []models.RestaurantOrderItem

	for _, itemReq := range req.Items {
		if itemReq.Quantity <= 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Restaurant item quantity must be greater than zero"})
			return
		}
		var menuItem models.MenuItem
		if err := tx.First(&menuItem, "id = ?", itemReq.MenuItemID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Menu item not found"})
			return
		}
		if !menuItem.IsAvailable {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("Menu item %s is unavailable", menuItem.Name)})
			return
		}

		lineTotal := menuItem.Price * float64(itemReq.Quantity)
		subtotal += lineTotal

		orderItems = append(orderItems, models.RestaurantOrderItem{
			MenuItemID: menuItem.ID,
			ItemName:   menuItem.Name,
			UnitPrice:  menuItem.Price,
			Quantity:   itemReq.Quantity,
			TotalPrice: lineTotal,
			Notes:      itemReq.Notes,
		})
	}
	if req.OrderType == models.OrderDineIn && req.TableID == nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dine-in orders require a table"})
		return
	}
	if req.OrderType == models.OrderRoomService && req.RoomID == nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room-service orders require a room"})
		return
	}

	tax := subtotal * 0.10 // 10% F&B VAT
	total := subtotal + tax

	var orderCount int64
	tx.Model(&models.RestaurantOrder{}).Count(&orderCount)
	orderNumber := fmt.Sprintf("POS-%d-%04d", time.Now().Year(), orderCount+1)

	order := models.RestaurantOrder{
		OrderNumber: orderNumber,
		OrderType:   req.OrderType,
		TableID:     req.TableID,
		RoomID:      req.RoomID,
		Status:      models.OrderPlaced,
		Subtotal:    subtotal,
		Tax:         tax,
		Total:       total,
		Notes:       req.Notes,
		Items:       orderItems,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create restaurant order"})
		return
	}

	// If Dine In and Table specified, update table status
	if req.OrderType == models.OrderDineIn && req.TableID != nil {
		tx.Model(&models.RestaurantTable{}).Where("id = ?", *req.TableID).Update("status", "occupied")
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit order"})
		return
	}

	database.DB.Preload("Table").Preload("Room").Preload("Items").First(&order, order.ID)
	websocket.BroadcastEvent("RESTAURANT_ORDER_CREATED", order)

	c.JSON(http.StatusCreated, gin.H{"order": order})
}

func GetRestaurantOrders(c *gin.Context) {
	var orders []models.RestaurantOrder
	query := database.DB.Preload("Table").Preload("Room").Preload("Items").Order("created_at desc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

type ChargeToRoomRequest struct {
	RoomID uuid.UUID `json:"room_id" binding:"required"`
}

// Transfer authorized restaurant charge directly to the guest folio!
func ChargeOrderToRoom(c *gin.Context) {
	orderIDStr := c.Param("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req ChargeToRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var order models.RestaurantOrder
	if err := tx.Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Status == models.OrderChargedToRoom || order.Status == models.OrderPaid {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order has already been settled or charged to room"})
		return
	}

	// Verify Room has an in-house checked-in guest with an open folio
	var folio models.GuestFolio
	err = tx.Preload("Reservation").Preload("Guest").
		Where("room_id = ? AND status = ?", req.RoomID, models.FolioOpen).
		First(&folio).Error

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active open folio found for this room. Ensure the guest is checked in."})
		return
	}
	if folio.Reservation == nil || folio.Reservation.Status != models.ResCheckedIn {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Room charge requires an in-house checked-in guest"})
		return
	}

	// Update Folio with Restaurant Charge
	folio.TotalCharges += order.Total
	folio.Balance += order.Total
	tx.Save(&folio)

	// Record Folio Transaction
	txFolio := models.FolioTransaction{
		FolioID:     folio.ID,
		Type:        models.TxRestaurant,
		Description: fmt.Sprintf("Restaurant & Dining (%s - %s)", order.OrderNumber, order.OrderType),
		ReferenceID: order.OrderNumber,
		Amount:      order.Total,
		IsCredit:    false,
	}
	tx.Create(&txFolio)

	// Update Order Status
	order.Status = models.OrderChargedToRoom
	order.GuestFolioID = &folio.ID
	order.RoomID = &req.RoomID
	tx.Save(&order)

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to transfer charge to room"})
		return
	}

	websocket.BroadcastEvent("FOLIO_UPDATED", folio)
	websocket.BroadcastEvent("ORDER_CHARGED_TO_ROOM", order)

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Order %s (%.2f BDT) successfully charged to Room folio of guest %s %s.",
			order.OrderNumber, order.Total, folio.Guest.FirstName, folio.Guest.LastName),
		"order": order,
		"folio": folio,
	})
}
