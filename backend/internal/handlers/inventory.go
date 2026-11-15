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

func GetInventoryItems(c *gin.Context) {
	var items []models.InventoryItem
	query := database.DB.Preload("Supplier").Order("name asc")

	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}
	if lowStock := c.Query("low_stock"); lowStock == "true" {
		query = query.Where("current_stock <= minimum_stock")
	}

	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch inventory items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

type StockAdjustmentRequest struct {
	ItemID     uuid.UUID                    `json:"item_id" binding:"required"`
	Type       models.InventoryMovementType `json:"type" binding:"required"` // received, consumed, damaged, adjustment
	Quantity   int                          `json:"quantity" binding:"required"`
	Reason     string                       `json:"reason"`
	Department string                       `json:"department"`
}

func AdjustInventoryStock(c *gin.Context) {
	var req StockAdjustmentRequest
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

	var item models.InventoryItem
	if err := tx.First(&item, "id = ?", req.ItemID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}

	if req.Type == models.MovementConsumed || req.Type == models.MovementDamaged {
		if item.CurrentStock < req.Quantity {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient stock available for consumption"})
			return
		}
		item.CurrentStock -= req.Quantity
	} else if req.Type == models.MovementReceived {
		item.CurrentStock += req.Quantity
		now := time.Now()
		item.LastRestockedAt = &now
	} else if req.Type == models.MovementAdjustment {
		item.CurrentStock = req.Quantity
	}

	tx.Save(&item)

	movement := models.InventoryMovement{
		ItemID:     item.ID,
		Type:       req.Type,
		Quantity:   req.Quantity,
		Reason:     req.Reason,
		Department: req.Department,
	}
	tx.Create(&movement)

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stock"})
		return
	}

	websocket.BroadcastEvent("INVENTORY_UPDATED", item)

	c.JSON(http.StatusOK, gin.H{
		"message": "Stock updated successfully",
		"item":    item,
	})
}

func GetSuppliers(c *gin.Context) {
	var suppliers []models.Supplier
	if err := database.DB.Order("name asc").Find(&suppliers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suppliers"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"suppliers": suppliers})
}

func GetPurchaseOrders(c *gin.Context) {
	var pos []models.PurchaseOrder
	if err := database.DB.Preload("Supplier").Preload("Items").Order("created_at desc").Find(&pos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"purchase_orders": pos})
}

type CreatePORequest struct {
	SupplierID uuid.UUID `json:"supplier_id" binding:"required"`
	Items      []struct {
		ItemName  string  `json:"item_name" binding:"required"`
		Quantity  int     `json:"quantity" binding:"required"`
		UnitPrice float64 `json:"unit_price" binding:"required"`
	} `json:"items" binding:"required"`
}

func CreatePurchaseOrder(c *gin.Context) {
	var req CreatePORequest
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

	var totalAmount float64
	var poItems []models.PurchaseOrderItem

	for _, itm := range req.Items {
		lineTotal := itm.UnitPrice * float64(itm.Quantity)
		totalAmount += lineTotal
		poItems = append(poItems, models.PurchaseOrderItem{
			ItemName:   itm.ItemName,
			Quantity:   itm.Quantity,
			UnitPrice:  itm.UnitPrice,
			TotalPrice: lineTotal,
		})
	}

	var count int64
	tx.Model(&models.PurchaseOrder{}).Count(&count)
	poNum := fmt.Sprintf("PO-%d-%04d", time.Now().Year(), count+1)

	po := models.PurchaseOrder{
		PONumber:    poNum,
		SupplierID:  req.SupplierID,
		Status:      models.PODraft,
		TotalAmount: totalAmount,
		Items:       poItems,
	}

	if err := tx.Create(&po).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create PO"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit PO"})
		return
	}

	database.DB.Preload("Supplier").Preload("Items").First(&po, po.ID)

	c.JSON(http.StatusCreated, gin.H{"purchase_order": po})
}

func ApprovePurchaseOrder(c *gin.Context) {
	idStr := c.Param("id")
	poID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid PO ID"})
		return
	}

	var po models.PurchaseOrder
	if err := database.DB.First(&po, "id = ?", poID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase order not found"})
		return
	}

	po.Status = models.POApproved
	database.DB.Save(&po)

	c.JSON(http.StatusOK, gin.H{
		"message":        fmt.Sprintf("Purchase order %s approved.", po.PONumber),
		"purchase_order": po,
	})
}

