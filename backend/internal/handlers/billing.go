package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"
	"hotelos/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
		Preload("Transactions", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at asc")
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

	if folio.Status != models.FolioOpen {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Charges can only be added to an open folio"})
		return
	}

	// Update folio totals
	folio.TotalCharges += req.Amount
	folio.Balance += req.Amount
	if err := tx.Save(&folio).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update folio totals"})
		return
	}

	// Insert transaction
	txn := models.FolioTransaction{
		FolioID:     folio.ID,
		Type:        req.Type,
		Description: req.Description,
		Amount:      req.Amount,
		IsCredit:    false,
	}
	if err := tx.Create(&txn).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record folio charge"})
		return
	}

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
	if !validPaymentMethod(req.PaymentMethod) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported payment method"})
		return
	}
	if (req.FolioID == nil || *req.FolioID == uuid.Nil) && (req.InvoiceID == nil || *req.InvoiceID == uuid.Nil) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A folio_id or invoice_id is required"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	payNumber := fmt.Sprintf("PAY-%d-%s", time.Now().Year(), strings.ToUpper(uuid.NewString()[:8]))
	var folio *models.GuestFolio
	if req.FolioID != nil && *req.FolioID != uuid.Nil {
		var f models.GuestFolio
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&f, "id = ?", *req.FolioID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Folio not found"})
			return
		}
		if f.Status != models.FolioOpen || f.GuestID != req.GuestID {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Payment guest does not own an open folio"})
			return
		}
		if req.Amount > f.Balance {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payment exceeds the outstanding folio balance"})
			return
		}
		folio = &f
	}
	var invoice *models.Invoice
	if req.InvoiceID != nil && *req.InvoiceID != uuid.Nil {
		var inv models.Invoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, "id = ?", *req.InvoiceID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
			return
		}
		if inv.GuestID != req.GuestID || inv.Status == models.InvoiceVoid {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Payment guest does not own a payable invoice"})
			return
		}
		if folio != nil && inv.FolioID != folio.ID {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice and folio do not belong together"})
			return
		}
		invoice = &inv
	}
	if req.TransactionRef != "" {
		var duplicate int64
		if err := tx.Model(&models.Payment{}).Where("transaction_ref = ? AND status = ?", req.TransactionRef, models.PaymentCompleted).Count(&duplicate).Error; err != nil || duplicate > 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Payment transaction reference already exists"})
			return
		}
	}

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
	if folio != nil {
		folio.TotalPayments += req.Amount
		folio.Balance = folio.TotalCharges - folio.TotalPayments
		if err := tx.Save(folio).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update folio"})
			return
		}

		txPay := models.FolioTransaction{
			FolioID:     folio.ID,
			Type:        models.TxPayment,
			Description: fmt.Sprintf("Payment via %s (%s)", req.PaymentMethod, payNumber),
			ReferenceID: payNumber,
			Amount:      req.Amount,
			IsCredit:    true,
		}
		if err := tx.Create(&txPay).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record folio payment"})
			return
		}
	}

	// Update Invoice if specified
	if invoice != nil {
		invoice.PaidAmount += req.Amount
		if invoice.PaidAmount >= invoice.GrandTotal {
			invoice.Status = models.InvoicePaid
		} else {
			invoice.Status = models.InvoicePartiallyPaid
		}
		if err := tx.Save(invoice).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice"})
			return
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

func validPaymentMethod(method models.PaymentMethod) bool {
	switch method {
	case models.PayMethodCash, models.PayMethodDebitCard, models.PayMethodCreditCard, models.PayMethodBankTransfer, models.PayMethodBkash, models.PayMethodNagad:
		return true
	default:
		return false
	}
}

func RefundPayment(c *gin.Context) {
	paymentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment ID"})
		return
	}
	var req struct {
		Amount float64 `json:"amount"`
		Reason string  `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A positive refund amount is required"})
		return
	}
	tx := database.DB.Begin()
	var payment models.Payment
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payment, "id = ?", paymentID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}
	if payment.Status != models.PaymentCompleted || req.Amount != payment.Amount {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Only a full refund of a completed payment is supported"})
		return
	}
	if payment.FolioID == nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment is not attached to a folio"})
		return
	}
	var folio models.GuestFolio
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&folio, "id = ?", *payment.FolioID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Folio not found"})
		return
	}
	payment.Status = models.PaymentRefunded
	if err := tx.Save(&payment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refund payment"})
		return
	}
	folio.TotalPayments -= req.Amount
	folio.Balance = folio.TotalCharges - folio.TotalPayments
	folio.Status = models.FolioOpen
	if err := tx.Save(&folio).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update folio"})
		return
	}
	refund := models.FolioTransaction{FolioID: folio.ID, Type: models.TxRefund, Description: "Payment refund: " + req.Reason, ReferenceID: payment.PaymentNumber, Amount: req.Amount, IsCredit: false}
	if err := tx.Create(&refund).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record refund"})
		return
	}
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit refund"})
		return
	}
	websocket.BroadcastEvent("PAYMENT_REFUNDED", payment)
	c.JSON(http.StatusOK, gin.H{"payment": payment, "folio": folio})
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
