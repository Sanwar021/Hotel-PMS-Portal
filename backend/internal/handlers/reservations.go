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
	"gorm.io/gorm/clause"
)

type CreateReservationRequest struct {
	GuestID         *uuid.UUID           `json:"guest_id"` // Existing guest, or create new if nil
	GuestFirstName  string               `json:"guest_first_name"`
	GuestLastName   string               `json:"guest_last_name"`
	GuestEmail      string               `json:"guest_email"`
	GuestPhone      string               `json:"guest_phone"`
	RoomID          *uuid.UUID           `json:"room_id"` // Specific room (optional)
	RoomTypeID      uuid.UUID            `json:"room_type_id" binding:"required"`
	RatePlanID      *uuid.UUID           `json:"rate_plan_id"`
	CheckInDate     string               `json:"check_in_date" binding:"required"`  // YYYY-MM-DD
	CheckOutDate    string               `json:"check_out_date" binding:"required"` // YYYY-MM-DD
	Adults          int                  `json:"adults"`
	Children        int                  `json:"children"`
	BookingSource   models.BookingSource `json:"booking_source"`
	AdvancePayment  float64              `json:"advance_payment"`
	SpecialRequests string               `json:"special_requests"`
	Notes           string               `json:"notes"`
}

func CreateReservation(c *gin.Context) {
	var req CreateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cIn, err := time.Parse("2006-01-02", req.CheckInDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check-in date format. Use YYYY-MM-DD"})
		return
	}
	cOut, err := time.Parse("2006-01-02", req.CheckOutDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check-out date format. Use YYYY-MM-DD"})
		return
	}

	if !cOut.After(cIn) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Check-out date must be strictly after check-in date"})
		return
	}

	nights := int(cOut.Sub(cIn).Hours() / 24)
	if nights < 1 {
		nights = 1
	}

	// Begin strict database transaction with concurrency lock
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Fetch or create Guest
	var guest models.Guest
	if req.GuestID != nil && *req.GuestID != uuid.Nil {
		if err := tx.First(&guest, "id = ?", *req.GuestID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Specified guest profile not found"})
			return
		}
	} else {
		if req.GuestFirstName == "" || req.GuestLastName == "" {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Guest first and last name are required for new guest"})
			return
		}

		// Get default hotel
		var hotel models.Hotel
		tx.First(&hotel)

		guest = models.Guest{
			HotelID:     hotel.ID,
			FirstName:   req.GuestFirstName,
			LastName:    req.GuestLastName,
			Email:       req.GuestEmail,
			Phone:       req.GuestPhone,
			Nationality: "Bangladeshi",
			VIPStatus:   models.VIPNone,
		}
		if err := tx.Create(&guest).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guest profile"})
			return
		}
	}

	// 2. Fetch RoomType
	var roomType models.RoomType
	if err := tx.First(&roomType, "id = ?", req.RoomTypeID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Room type not found"})
		return
	}

	// 3. Fetch RatePlan
	var ratePlan models.RatePlan
	priceModifier := 0.0
	if req.RatePlanID != nil && *req.RatePlanID != uuid.Nil {
		if err := tx.First(&ratePlan, "id = ?", *req.RatePlanID).Error; err == nil {
			priceModifier = ratePlan.PriceModifierPercentage
		}
	}

	// 4. Room Allocation & Concurrency Guard against Double Booking
	var assignedRoomID *uuid.UUID

	if req.RoomID != nil && *req.RoomID != uuid.Nil {
		// Strict Row Lock on the specific room
		var room models.Room
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", *req.RoomID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Selected room does not exist"})
			return
		}

		if room.Status == models.RoomStatusOutOfOrder {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Selected room is currently Out of Order and cannot be booked"})
			return
		}

		// Check for overlapping confirmed or checked-in reservations
		var conflictCount int64
		tx.Model(&models.Reservation{}).
			Where("room_id = ? AND status IN (?, ?) AND check_in_date < ? AND check_out_date > ?",
				room.ID, models.ResConfirmed, models.ResCheckedIn, cOut, cIn).
			Count(&conflictCount)

		if conflictCount > 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{
				"error": fmt.Sprintf("Room %s is already reserved or occupied for overlapping dates (%s to %s)",
					room.RoomNumber, req.CheckInDate, req.CheckOutDate),
			})
			return
		}
		assignedRoomID = &room.ID
	} else {
		// Auto-assign available room in this category
		var candidateRooms []models.Room
		tx.Where("room_type_id = ? AND status != ?", roomType.ID, models.RoomStatusOutOfOrder).Find(&candidateRooms)

		for _, cand := range candidateRooms {
			var conflictCount int64
			tx.Model(&models.Reservation{}).
				Where("room_id = ? AND status IN (?, ?) AND check_in_date < ? AND check_out_date > ?",
					cand.ID, models.ResConfirmed, models.ResCheckedIn, cOut, cIn).
				Count(&conflictCount)

			if conflictCount == 0 {
				assignedRoomID = &cand.ID
				break
			}
		}

		if assignedRoomID == nil {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{
				"error": fmt.Sprintf("No available rooms found in category '%s' for dates %s to %s",
					roomType.Name, req.CheckInDate, req.CheckOutDate),
			})
			return
		}
	}

	// 5. Financial Calculations
	baseRate := roomType.BasePrice * (1.0 + priceModifier/100.0)
	subtotal := baseRate * float64(nights)
	tax := subtotal * 0.15          // 15% VAT
	serviceCharge := subtotal * 0.10 // 10% Service charge
	totalAmount := subtotal + tax + serviceCharge

	// Sequence generation
	var resCount int64
	tx.Model(&models.Reservation{}).Count(&resCount)
	resNumber := fmt.Sprintf("RES-%d-%04d", time.Now().Year(), resCount+1)

	source := models.SourceDirect
	if req.BookingSource != "" {
		source = req.BookingSource
	}

	adults := req.Adults
	if adults < 1 {
		adults = 1
	}

	res := models.Reservation{
		HotelID:           roomType.PropertyID,
		PropertyID:        roomType.PropertyID,
		ReservationNumber: resNumber,
		GuestID:           guest.ID,
		RoomID:            assignedRoomID,
		RoomTypeID:        roomType.ID,
		RatePlanID:        req.RatePlanID,
		CheckInDate:       cIn,
		CheckOutDate:      cOut,
		Nights:            nights,
		Adults:            adults,
		Children:          req.Children,
		BookingSource:     source,
		Status:            models.ResConfirmed,
		BaseRate:          baseRate,
		TaxAmount:         tax,
		ServiceCharge:     serviceCharge,
		TotalAmount:       totalAmount,
		PaidAmount:        req.AdvancePayment,
		SpecialRequests:   req.SpecialRequests,
		Notes:             req.Notes,
	}

	if err := tx.Create(&res).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save reservation"})
		return
	}

	// If advance payment provided, create GuestFolio and Payment record immediately
	if req.AdvancePayment > 0 {
		folio := models.GuestFolio{
			ReservationID: res.ID,
			GuestID:       guest.ID,
			RoomID:        assignedRoomID,
			Status:        models.FolioOpen,
			TotalCharges:  totalAmount,
			TotalPayments: req.AdvancePayment,
			Balance:       totalAmount - req.AdvancePayment,
		}
		tx.Create(&folio)

		txPay := models.FolioTransaction{
			FolioID:     folio.ID,
			Type:        models.TxPayment,
			Description: "Advance Reservation Deposit",
			Amount:      req.AdvancePayment,
			IsCredit:    true,
		}
		tx.Create(&txPay)

		payment := models.Payment{
			PaymentNumber:  fmt.Sprintf("PAY-%d-%X", time.Now().Year(), time.Now().UnixNano()%100000000),
			FolioID:        &folio.ID,
			GuestID:        guest.ID,
			Amount:         req.AdvancePayment,
			PaymentMethod:  models.PayMethodCreditCard,
			TransactionRef: fmt.Sprintf("DEP-%d", time.Now().UnixNano()),
			Status:         models.PaymentCompleted,
			Notes:          "Online/Phone Advance Deposit",
		}
		tx.Create(&payment)
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit reservation transaction"})
		return
	}

	// Preload full object for response and WebSocket
	database.DB.Preload("Guest").Preload("Room").Preload("RoomType").Preload("RatePlan").First(&res, res.ID)
	websocket.BroadcastEvent("RESERVATION_CREATED", res)

	c.JSON(http.StatusCreated, gin.H{
		"reservation": res,
		"message":     fmt.Sprintf("Reservation %s successfully created and confirmed.", res.ReservationNumber),
	})
}

func GetReservations(c *gin.Context) {
	var reservations []models.Reservation
	query := database.DB.Preload("Guest").Preload("Room").Preload("RoomType").Preload("RatePlan").
		Order("check_in_date desc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if search := c.Query("search"); search != "" {
		searchPattern := "%" + search + "%"
		query = query.Joins("LEFT JOIN guests ON guests.id = reservations.guest_id").
			Where("reservation_number ILIKE ? OR guests.first_name ILIKE ? OR guests.last_name ILIKE ? OR guests.email ILIKE ?",
				searchPattern, searchPattern, searchPattern, searchPattern)
	}
	if from := c.Query("from_date"); from != "" {
		query = query.Where("check_in_date >= ?", from)
	}
	if to := c.Query("to_date"); to != "" {
		query = query.Where("check_out_date <= ?", to)
	}

	if err := query.Find(&reservations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reservations": reservations})
}

func GetReservationByID(c *gin.Context) {
	idStr := c.Param("id")
	resID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	var res models.Reservation
	if err := database.DB.Preload("Guest").Preload("Room").Preload("RoomType").Preload("RatePlan").
		First(&res, "id = ?", resID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}

	var folio models.GuestFolio
	hasFolio := database.DB.Preload("Transactions").First(&folio, "reservation_id = ?", res.ID).Error == nil

	c.JSON(http.StatusOK, gin.H{
		"reservation": res,
		"folio": func() interface{} {
			if hasFolio {
				return folio
			}
			return nil
		}(),
	})
}

func CancelReservation(c *gin.Context) {
	idStr := c.Param("id")
	resID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	var res models.Reservation
	if err := database.DB.First(&res, "id = ?", resID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}

	if res.Status == models.ResCheckedIn {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel a guest who is currently checked in. Perform checkout instead."})
		return
	}

	now := time.Now()
	res.Status = models.ResCancelled
	res.CancelledAt = &now
	res.CancellationReason = req.Reason
	if res.CancellationReason == "" {
		res.CancellationReason = "Cancelled by front desk"
	}

	if err := database.DB.Save(&res).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel reservation"})
		return
	}

	database.DB.Preload("Guest").Preload("Room").Preload("RoomType").First(&res, res.ID)
	websocket.BroadcastEvent("RESERVATION_CANCELLED", res)

	c.JSON(http.StatusOK, gin.H{
		"reservation": res,
		"message":     fmt.Sprintf("Reservation %s cancelled.", res.ReservationNumber),
	})
}

type CalendarRoomBlock struct {
	RoomID       uuid.UUID                `json:"room_id"`
	RoomNumber   string                   `json:"room_number"`
	RoomTypeName string                   `json:"room_type_name"`
	Floor        int                      `json:"floor"`
	Status       models.RoomStatus        `json:"status"`
	Bookings     []CalendarBookingSegment `json:"bookings"`
}

type CalendarBookingSegment struct {
	ReservationID     uuid.UUID                `json:"reservation_id"`
	ReservationNumber string                   `json:"reservation_number"`
	GuestName         string                   `json:"guest_name"`
	CheckInDate       string                   `json:"check_in_date"`
	CheckOutDate      string                   `json:"check_out_date"`
	Status            models.ReservationStatus `json:"status"`
	Nights            int                      `json:"nights"`
	TotalAmount       float64                  `json:"total_amount"`
}

func GetCalendarTimeline(c *gin.Context) {
	var rooms []models.Room
	database.DB.Preload("Floor").Preload("RoomType").Order("room_number asc").Find(&rooms)

	var reservations []models.Reservation
	database.DB.Preload("Guest").
		Where("status IN (?, ?) AND room_id IS NOT NULL", models.ResConfirmed, models.ResCheckedIn).
		Find(&reservations)

	resByRoom := make(map[uuid.UUID][]CalendarBookingSegment)
	for _, r := range reservations {
		if r.RoomID != nil {
			guestName := "Guest"
			if r.Guest != nil {
				guestName = fmt.Sprintf("%s %s", r.Guest.FirstName, r.Guest.LastName)
			}
			segment := CalendarBookingSegment{
				ReservationID:     r.ID,
				ReservationNumber: r.ReservationNumber,
				GuestName:         guestName,
				CheckInDate:       r.CheckInDate.Format("2006-01-02"),
				CheckOutDate:      r.CheckOutDate.Format("2006-01-02"),
				Status:            r.Status,
				Nights:            r.Nights,
				TotalAmount:       r.TotalAmount,
			}
			resByRoom[*r.RoomID] = append(resByRoom[*r.RoomID], segment)
		}
	}

	var timeline []CalendarRoomBlock
	for _, room := range rooms {
		floorNum := 1
		if room.Floor != nil {
			floorNum = room.Floor.FloorNumber
		}
		typeName := "Room"
		if room.RoomType != nil {
			typeName = room.RoomType.Name
		}

		timeline = append(timeline, CalendarRoomBlock{
			RoomID:       room.ID,
			RoomNumber:   room.RoomNumber,
			RoomTypeName: typeName,
			Floor:        floorNum,
			Status:       room.Status,
			Bookings:     resByRoom[room.ID],
		})
	}

	c.JSON(http.StatusOK, gin.H{"timeline": timeline})
}
