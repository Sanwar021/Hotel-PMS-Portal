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

func GetFolioByID(c *gin.Context) {
	idStr := c.Param("id")
	folioID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folio ID"})
		return
	}

	var folio models.GuestFolio
	err = database.DB.Preload("Reservation").Preload("Guest").Preload("Room").
		Preload("Transactions", func(db *gin.Engine) interface{} {
			return database.DB.Order("created_at asc")
		}).
		First(&folio, "id = ?", folioID).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Folio not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"folio": folio})
}

type AddFolioChargeRequest struct {
	Type        models.TransactionType `json:"type" binding:"required"` // minibar, laundry, pos, etc.
	Description string                 `json:"description" binding:"required"`
	Amount      float64                `json:"amount" binding:"required"`
}

func AddFolioCharge(c *gin.Context) {
	idStr := c.Param("id")
	folioID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folio ID"})
		return
	}

	var req AddFolioChargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Charge amount must be greater than zero"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var folio models.GuestFolio
	if err := tx.First(&folio, "id = ?", folioID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Folio not found"})
		return
	}

	if folio.Status == models.FolioClosed {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot add charges to a closed folio"})
		return
	}

	// Update folio totals
	folio.TotalCharges += req.Amount
	folio.Balance += req.Amount
	tx.Save(&folio)

	// Insert transaction
	txn := models.FolioTransaction{
		FolioID:     folio.ID,
		Type:        req.Type,
		Description: req.Description,
		Amount:      req.Amount,
		IsCredit:    false,
	}
	tx.Create(&txn)

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add charge"})
		return
	}

	websocket.BroadcastEvent("FOLIO_UPDATED", folio)

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Charge added successfully",
		"folio":       folio,
		"transaction": txn,
	})
}

type RecordPaymentRequest struct {
	FolioID        *uuid.UUID           `json:"folio_id"`
	InvoiceID      *uuid.UUID           `json:"invoice_id"`
	GuestID        uuid.UUID            `json:"guest_id" binding:"required"`
	Amount         float64              `json:"amount" binding:"required"`
	PaymentMethod  models.PaymentMethod `json:"payment_method" binding:"required"`
	TransactionRef string               `json:"transaction_ref"`
	Notes          string               `json:"notes"`
}

func RecordPayment(c *gin.Context) {
	var req RecordPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment amount must be greater than zero"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	payNumber := fmt.Sprintf("PAY-%d-%X", time.Now().Year(), time.Now().UnixNano()%100000000)

	payment := models.Payment{
		PaymentNumber:  payNumber,
		FolioID:        req.FolioID,
		InvoiceID:      req.InvoiceID,
		GuestID:        req.GuestID,
		Amount:         req.Amount,
		PaymentMethod:  req.PaymentMethod,
		TransactionRef: req.TransactionRef,
		Status:         models.PaymentCompleted,
		Notes:          req.Notes,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record payment"})
		return
	}

	// Update Folio if specified
	if req.FolioID != nil && *req.FolioID != uuid.Nil {
		var folio models.GuestFolio
		if err := tx.First(&folio, "id = ?", *req.FolioID).Error; err == nil {
			folio.TotalPayments += req.Amount
			folio.Balance = folio.TotalCharges - folio.TotalPayments
			if folio.Balance <= 0 {
				folio.Balance = 0
			}
			tx.Save(&folio)

			txPay := models.FolioTransaction{
				FolioID:     folio.ID,
				Type:        models.TxPayment,
				Description: fmt.Sprintf("Payment via %s (%s)", req.PaymentMethod, payNumber),
				ReferenceID: payNumber,
				Amount:      req.Amount,
				IsCredit:    true,
			}
			tx.Create(&txPay)
		}
	}

	// Update Invoice if specified
	if req.InvoiceID != nil && *req.InvoiceID != uuid.Nil {
		var inv models.Invoice
		if err := tx.First(&inv, "id = ?", *req.InvoiceID).Error; err == nil {
			inv.PaidAmount += req.Amount
			if inv.PaidAmount >= inv.GrandTotal {
				inv.Status = models.InvoicePaid
			} else {
				inv.Status = models.InvoicePartiallyPaid
			}
			tx.Save(&inv)
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit payment"})
		return
	}

	websocket.BroadcastEvent("PAYMENT_RECORDED", payment)

	c.JSON(http.StatusCreated, gin.H{
		"message": fmt.Sprintf("Payment %s of %.2f BDT recorded successfully.", payNumber, req.Amount),
		"payment": payment,
	})
}

func GetInvoices(c *gin.Context) {
	var invoices []models.Invoice
	query := database.DB.Preload("Guest").Preload("Reservation").Preload("Payments").Order("created_at desc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invoices": invoices})
}

func GetInvoiceByID(c *gin.Context) {
	idStr := c.Param("id")
	invID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var invoice models.Invoice
	err = database.DB.Preload("Guest").Preload("Reservation").Preload("Reservation.Room").
		Preload("Reservation.RoomType").Preload("Payments").
		First(&invoice, "id = ?", invID).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	var hotel models.Hotel
	database.DB.First(&hotel)

	c.JSON(http.StatusOK, gin.H{
		"invoice": invoice,
		"hotel":   hotel,
	})
}
