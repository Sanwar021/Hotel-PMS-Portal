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
	"gorm.io/gorm/clause"
)

func GetArrivals(c *gin.Context) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	nextDay := today.AddDate(0, 0, 1)

	var arrivals []models.Reservation
	err := database.DB.Preload("Guest").Preload("Room").Preload("RoomType").Preload("RatePlan").
		Where("check_in_date >= ? AND check_in_date < ? AND status = ?", today, nextDay, models.ResConfirmed).
		Order("check_in_date asc").
		Find(&arrivals).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch arrivals"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"arrivals": arrivals})
}

func GetDepartures(c *gin.Context) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	nextDay := today.AddDate(0, 0, 1)

	var departures []models.Reservation
	err := database.DB.Preload("Guest").Preload("Room").Preload("RoomType").
		Where("check_out_date >= ? AND check_out_date < ? AND status = ?", today, nextDay, models.ResCheckedIn).
		Order("check_out_date asc").
		Find(&departures).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch departures"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"departures": departures})
}

func GetInHouseGuests(c *gin.Context) {
	var inHouse []models.Reservation
	err := database.DB.Preload("Guest").Preload("Room").Preload("RoomType").
		Where("status = ?", models.ResCheckedIn).
		Order("check_out_date asc").
		Find(&inHouse).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch in-house guests"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"in_house": inHouse})
}

type CheckInRequest struct {
	ReservationID    uuid.UUID           `json:"reservation_id" binding:"required"`
	RoomID           *uuid.UUID          `json:"room_id"` // Optional override or final confirmation
	KeyCardCode      string              `json:"key_card_code"`
	DepositAmount    float64             `json:"deposit_amount"`
	PaymentMethod    string              `json:"payment_method"`
	IdentityVerified bool                `json:"identity_verified"`
	Notes            string              `json:"notes"`
	GuestIdentity    *GuestIdentityInput `json:"guest_identity"`
}

type GuestIdentityInput struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	IDNumber    string `json:"id_number"`
	DateOfBirth string `json:"date_of_birth"`
	Address     string `json:"address"`
	Nationality string `json:"nationality"`
}

func CheckInGuest(c *gin.Context) {
	var req CheckInRequest
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

	var res models.Reservation
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Guest").Preload("RoomType").First(&res, "id = ?", req.ReservationID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}

	if res.Status != models.ResConfirmed {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only confirmed reservations can be checked in"})
		return
	}
	if !req.IdentityVerified {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Guest identity must be verified before check-in"})
		return
	}
	if req.GuestIdentity != nil {
		identity := req.GuestIdentity
		if strings.TrimSpace(identity.FirstName) == "" || strings.TrimSpace(identity.LastName) == "" || strings.TrimSpace(identity.IDNumber) == "" {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Guest name and National ID number are required after scanning"})
			return
		}
		idDigits := strings.Map(func(r rune) rune {
			if r >= '0' && r <= '9' {
				return r
			}
			return -1
		}, identity.IDNumber)
		if len(idDigits) < 10 || len(idDigits) > 17 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "National ID number must contain 10 to 17 digits"})
			return
		}
		var birthDate *time.Time
		if identity.DateOfBirth != "" {
			parsed, err := time.Parse("2006-01-02", identity.DateOfBirth)
			if err != nil || parsed.After(time.Now()) {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Date of birth is invalid"})
				return
			}
			birthDate = &parsed
		}
		verifiedAt := time.Now()
		updates := map[string]interface{}{
			"first_name": strings.TrimSpace(identity.FirstName), "last_name": strings.TrimSpace(identity.LastName),
			"id_type": "National ID", "id_number": idDigits, "address": strings.TrimSpace(identity.Address),
			"id_verified_at": verifiedAt,
		}
		if birthDate != nil {
			updates["date_of_birth"] = *birthDate
		}
		if strings.TrimSpace(identity.Nationality) != "" {
			updates["nationality"] = strings.TrimSpace(identity.Nationality)
		}
		if err := tx.Model(&models.Guest{}).Where("id = ?", res.GuestID).Updates(updates).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save verified National ID information"})
			return
		}
	}

	// Determine room to assign
	assignedRoomID := res.RoomID
	if req.RoomID != nil && *req.RoomID != uuid.Nil {
		assignedRoomID = req.RoomID
	}

	if assignedRoomID == nil || *assignedRoomID == uuid.Nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "A room must be assigned to complete check-in"})
		return
	}

	var room models.Room
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", *assignedRoomID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Assigned room not found"})
		return
	}
	if room.RoomTypeID != res.RoomTypeID || room.PropertyID != res.PropertyID {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Assigned room does not match the reservation room type and property"})
		return
	}
	if room.Status != models.RoomStatusAvailable && room.Status != models.RoomStatusInspected {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("Room %s cannot be checked in while its status is %s", room.RoomNumber, room.Status)})
		return
	}
	var conflictCount int64
	if err := tx.Model(&models.Reservation{}).
		Where("id <> ? AND room_id = ? AND status IN (?, ?) AND check_in_date < ? AND check_out_date > ?",
			res.ID, room.ID, models.ResConfirmed, models.ResCheckedIn, res.CheckOutDate, res.CheckInDate).
		Count(&conflictCount).Error; err != nil || conflictCount > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Assigned room has an overlapping reservation"})
		return
	}

	// Update Room status to OCCUPIED
	room.Status = models.RoomStatusOccupied
	if req.KeyCardCode != "" {
		room.KeyCardCode = req.KeyCardCode
	}
	if err := tx.Save(&room).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update room occupancy"})
		return
	}

	// Update Reservation
	res.RoomID = assignedRoomID
	res.Status = models.ResCheckedIn
	if err := tx.Save(&res).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reservation status"})
		return
	}

	// Find or Create Folio
	var folio models.GuestFolio
	if err := tx.First(&folio, "reservation_id = ?", res.ID).Error; err != nil {
		// Create new active folio
		folio = models.GuestFolio{
			ReservationID: res.ID,
			GuestID:       res.GuestID,
			RoomID:        assignedRoomID,
			Status:        models.FolioOpen,
			TotalCharges:  res.TotalAmount,
			TotalPayments: res.PaidAmount,
			Balance:       res.TotalAmount - res.PaidAmount,
		}
		if err := tx.Create(&folio).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guest folio"})
			return
		}

		// Record room charge transaction
		txRoom := models.FolioTransaction{
			FolioID:     folio.ID,
			Type:        models.TxRoomCharge,
			Description: fmt.Sprintf("%d Nights Accommodation - %s", res.Nights, res.RoomType.Name),
			Amount:      res.BaseRate * float64(res.Nights),
			IsCredit:    false,
		}
		if err := tx.Create(&txRoom).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add room charge"})
			return
		}

		// Taxes
		txTax := models.FolioTransaction{
			FolioID:     folio.ID,
			Type:        models.TxTax,
			Description: "VAT (15%) & Service Charge (10%)",
			Amount:      res.TaxAmount + res.ServiceCharge,
			IsCredit:    false,
		}
		if err := tx.Create(&txTax).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add taxes"})
			return
		}
	} else {
		folio.RoomID = assignedRoomID
		folio.Status = models.FolioOpen
		tx.Save(&folio)
	}

	// If check-in deposit was recorded
	if req.DepositAmount > 0 {
		if req.DepositAmount > folio.Balance {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Deposit cannot exceed the outstanding folio balance"})
			return
		}
		folio.TotalPayments += req.DepositAmount
		folio.Balance = folio.TotalCharges - folio.TotalPayments
		tx.Save(&folio)

		txDep := models.FolioTransaction{
			FolioID:     folio.ID,
			Type:        models.TxPayment,
			Description: fmt.Sprintf("Check-in Deposit (%s)", req.PaymentMethod),
			Amount:      req.DepositAmount,
			IsCredit:    true,
		}
		if err := tx.Create(&txDep).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record deposit"})
			return
		}

		payment := models.Payment{
			PaymentNumber:  fmt.Sprintf("PAY-%d-%X", time.Now().Year(), time.Now().UnixNano()%100000000),
			FolioID:        &folio.ID,
			GuestID:        res.GuestID,
			Amount:         req.DepositAmount,
			PaymentMethod:  models.PaymentMethod(req.PaymentMethod),
			TransactionRef: fmt.Sprintf("CHKIN-%d", time.Now().UnixNano()),
			Status:         models.PaymentCompleted,
			Notes:          "Check-in front desk payment",
		}
		if err := tx.Create(&payment).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save deposit"})
			return
		}
		res.PaidAmount += req.DepositAmount
		if err := tx.Save(&res).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reservation payment total"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete check-in"})
		return
	}

	database.DB.Preload("Guest").Preload("Room").Preload("RoomType").First(&res, res.ID)
	websocket.BroadcastEvent("CHECK_IN_COMPLETED", res)
	websocket.BroadcastEvent("ROOM_STATUS_CHANGED", room)

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("Guest %s %s successfully checked in to Room %s.", res.Guest.FirstName, res.Guest.LastName, room.RoomNumber),
		"reservation": res,
		"folio_id":    folio.ID,
	})
}

type CheckOutRequest struct {
	ReservationID uuid.UUID `json:"reservation_id" binding:"required"`
	PaymentMethod string    `json:"payment_method"`
	SettlePayment bool      `json:"settle_payment"`
	Notes         string    `json:"notes"`
}

func CheckOutGuest(c *gin.Context) {
	var req CheckOutRequest
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

	var res models.Reservation
	if err := tx.Preload("Guest").Preload("Room").First(&res, "id = ?", req.ReservationID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}

	if res.Status != models.ResCheckedIn {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only in-house checked-in guests can be checked out"})
		return
	}

	var folio models.GuestFolio
	if err := tx.Preload("Transactions").First(&folio, "reservation_id = ?", res.ID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Active folio not found for this reservation"})
		return
	}

	if folio.Status != models.FolioOpen {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Only an open folio can be checked out"})
		return
	}
	if folio.Balance > 0 && !req.SettlePayment {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Outstanding folio balance must be settled before checkout"})
		return
	}

	// Settle remaining balance if requested
	if folio.Balance > 0 && req.SettlePayment {
		settleAmount := folio.Balance
		folio.TotalPayments += settleAmount
		folio.Balance = 0

		payMethod := models.PayMethodCreditCard
		if req.PaymentMethod != "" {
			payMethod = models.PaymentMethod(req.PaymentMethod)
		}

		txPay := models.FolioTransaction{
			FolioID:     folio.ID,
			Type:        models.TxPayment,
			Description: fmt.Sprintf("Checkout Settlement (%s)", payMethod),
			Amount:      settleAmount,
			IsCredit:    true,
		}
		if err := tx.Create(&txPay).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record checkout payment"})
			return
		}

		payment := models.Payment{
			PaymentNumber:  fmt.Sprintf("PAY-%d-%X", time.Now().Year(), time.Now().UnixNano()%100000000),
			FolioID:        &folio.ID,
			GuestID:        res.GuestID,
			Amount:         settleAmount,
			PaymentMethod:  payMethod,
			TransactionRef: fmt.Sprintf("CHKOUT-%d", time.Now().UnixNano()),
			Status:         models.PaymentCompleted,
			Notes:          "Checkout final folio settlement",
		}
		if err := tx.Create(&payment).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save checkout payment"})
			return
		}
		res.PaidAmount += settleAmount
	}

	// Mark Folio as Settled
	folio.Status = models.FolioSettled
	if err := tx.Save(&folio).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to settle folio"})
		return
	}

	// Update Reservation Status to CHECKED_OUT
	res.Status = models.ResCheckedOut
	if err := tx.Save(&res).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete reservation checkout"})
		return
	}

	var invoice models.Invoice
	if err := tx.First(&invoice, "folio_id = ?", folio.ID).Error; err != nil {
		invoice = models.Invoice{
			InvoiceNumber: fmt.Sprintf("INV-%d-%s", time.Now().Year(), strings.ToUpper(uuid.NewString()[:8])),
			FolioID:       folio.ID, ReservationID: res.ID, GuestID: res.GuestID,
			Subtotal:  folio.TotalCharges - res.TaxAmount - res.ServiceCharge,
			TaxAmount: res.TaxAmount, ServiceCharge: res.ServiceCharge,
			GrandTotal: folio.TotalCharges, PaidAmount: folio.TotalPayments,
			Status: models.InvoicePaid, DueDate: time.Now(),
		}
		if err := tx.Create(&invoice).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create final invoice"})
			return
		}
	}

	// Update Room Status to DIRTY
	if res.Room != nil {
		res.Room.Status = models.RoomStatusDirty
		tx.Save(res.Room)

		// AUTOMATICALLY CREATE HOUSEKEEPING TASK FOR TURNOVER
		hkTask := models.HousekeepingTask{
			RoomID:    res.Room.ID,
			TaskType:  models.HKCheckoutTurnover,
			Priority:  models.PriorityHigh,
			Status:    models.RoomStatusDirty,
			Checklist: `[{"item":"Strip bed linens & sanitize mattress","done":false},{"item":"Sanitize bathroom fixtures & restock towels","done":false},{"item":"Restock coffee/tea & minibar items","done":false},{"item":"Mop & vacuum floors","done":false}]`,
			Notes:     fmt.Sprintf("Checkout turnover generated for Room %s. Guest: %s %s.", res.Room.RoomNumber, res.Guest.FirstName, res.Guest.LastName),
		}
		if err := tx.Create(&hkTask).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create turnover task"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete checkout"})
		return
	}
	if res.Room != nil {
		websocket.BroadcastEvent("HOUSEKEEPING_TASK_CREATED", gin.H{"room_id": res.Room.ID})
		websocket.BroadcastEvent("ROOM_STATUS_CHANGED", res.Room)
	}

	websocket.BroadcastEvent("CHECK_OUT_COMPLETED", res)

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("Guest %s %s successfully checked out. Room %s is now assigned to Housekeeping (Dirty).", res.Guest.FirstName, res.Guest.LastName, res.Room.RoomNumber),
		"reservation": res,
		"folio":       folio,
	})
}

type TransferRoomRequest struct {
	ReservationID uuid.UUID `json:"reservation_id" binding:"required"`
	NewRoomID     uuid.UUID `json:"new_room_id" binding:"required"`
	Reason        string    `json:"reason"`
}

func TransferRoom(c *gin.Context) {
	var req TransferRoomRequest
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

	var res models.Reservation
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Room").First(&res, "id = ?", req.ReservationID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}
	if res.Status != models.ResCheckedIn {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only an in-house reservation can be transferred"})
		return
	}

	var newRoom models.Room
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&newRoom, "id = ?", req.NewRoomID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "New target room not found"})
		return
	}
	if newRoom.ID == *res.RoomID || newRoom.PropertyID != res.PropertyID || newRoom.RoomTypeID != res.RoomTypeID {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target room must be a different room of the reserved type and property"})
		return
	}
	var transferConflict int64
	if err := tx.Model(&models.Reservation{}).Where("id <> ? AND room_id = ? AND status IN (?, ?) AND check_in_date < ? AND check_out_date > ?",
		res.ID, newRoom.ID, models.ResConfirmed, models.ResCheckedIn, res.CheckOutDate, res.CheckInDate).Count(&transferConflict).Error; err != nil || transferConflict > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Target room has an overlapping reservation"})
		return
	}

	if newRoom.Status != models.RoomStatusAvailable && newRoom.Status != models.RoomStatusInspected {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Room %s is not available (Current status: %s)", newRoom.RoomNumber, newRoom.Status)})
		return
	}

	// Old room becomes dirty
	if res.Room != nil {
		res.Room.Status = models.RoomStatusDirty
		tx.Save(res.Room)
		hkTask := models.HousekeepingTask{RoomID: res.Room.ID, TaskType: models.HKCheckoutTurnover, Priority: models.PriorityHigh, Status: models.RoomStatusDirty, Notes: "Room transfer turnover"}
		if err := tx.Create(&hkTask).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create old-room turnover task"})
			return
		}
	}

	// New room becomes occupied
	newRoom.Status = models.RoomStatusOccupied
	tx.Save(&newRoom)

	// Update reservation
	res.RoomID = &newRoom.ID
	tx.Save(&res)

	// Update folio
	tx.Model(&models.GuestFolio{}).Where("reservation_id = ?", res.ID).Update("room_id", newRoom.ID)

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to transfer room"})
		return
	}
	if res.Room != nil {
		websocket.BroadcastEvent("ROOM_STATUS_CHANGED", res.Room)
	}

	websocket.BroadcastEvent("ROOM_TRANSFERRED", res)
	websocket.BroadcastEvent("ROOM_STATUS_CHANGED", newRoom)

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("Guest transferred successfully to Room %s.", newRoom.RoomNumber),
		"reservation": res,
	})
}
