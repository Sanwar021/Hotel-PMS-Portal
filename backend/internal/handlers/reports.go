package handlers

import (
	"net/http"
	"time"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
)

type DailyBusinessReport struct {
	ReportDate          string  `json:"report_date"`
	TotalRooms          int64   `json:"total_rooms"`
	RoomsSold           int64   `json:"rooms_sold"`
	AvailableRooms      int64   `json:"available_rooms"`
	OccupancyRate       float64 `json:"occupancy_rate"`
	TotalRoomRevenue    float64 `json:"total_room_revenue"`
	TotalFBRevenue      float64 `json:"total_fb_revenue"`
	TotalPayments       float64 `json:"total_payments"`
	TotalTaxCollected   float64 `json:"total_tax_collected"`
	ADR                 float64 `json:"adr"`
	RevPAR              float64 `json:"revpar"`
	CheckInsCount       int64   `json:"check_ins_count"`
	CheckOutsCount      int64   `json:"check_outs_count"`
	InHouseGuestsCount  int64   `json:"in_house_guests_count"`
}

func GetDailyBusinessReport(c *gin.Context) {
	db := database.DB
	now := time.Now()
	dateStr := c.Query("date")
	targetDate := now

	if dateStr != "" {
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
			targetDate = t
		}
	}

	startOfDay := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 0, 0, 0, 0, targetDate.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	var report DailyBusinessReport
	report.ReportDate = startOfDay.Format("2006-01-02")

	// Total rooms
	db.Model(&models.Room{}).Count(&report.TotalRooms)

	// Occupied / Sold rooms
	db.Model(&models.Reservation{}).
		Where("check_in_date <= ? AND check_out_date > ? AND status IN (?, ?)",
			startOfDay, startOfDay, models.ResCheckedIn, models.ResCheckedOut).
		Count(&report.RoomsSold)

	report.AvailableRooms = report.TotalRooms - report.RoomsSold
	if report.AvailableRooms < 0 {
		report.AvailableRooms = 0
	}

	if report.TotalRooms > 0 {
		report.OccupancyRate = float64(report.RoomsSold) / float64(report.TotalRooms) * 100.0
	}

	// Room revenue
	db.Model(&models.FolioTransaction{}).
		Where("type = ? AND created_at >= ? AND created_at < ?", models.TxRoomCharge, startOfDay, endOfDay).
		Select("COALESCE(SUM(amount), 0)").Scan(&report.TotalRoomRevenue)

	// F&B Revenue
	db.Model(&models.RestaurantOrder{}).
		Where("status IN (?, ?) AND created_at >= ? AND created_at < ?",
			models.OrderPaid, models.OrderChargedToRoom, startOfDay, endOfDay).
		Select("COALESCE(SUM(total), 0)").Scan(&report.TotalFBRevenue)

	// Payments collected
	db.Model(&models.Payment{}).
		Where("status = ? AND created_at >= ? AND created_at < ?", models.PaymentCompleted, startOfDay, endOfDay).
		Select("COALESCE(SUM(amount), 0)").Scan(&report.TotalPayments)

	// Tax collected
	db.Model(&models.FolioTransaction{}).
		Where("type = ? AND created_at >= ? AND created_at < ?", models.TxTax, startOfDay, endOfDay).
		Select("COALESCE(SUM(amount), 0)").Scan(&report.TotalTaxCollected)

	// ADR = Room Revenue / Rooms Sold
	if report.RoomsSold > 0 {
		report.ADR = report.TotalRoomRevenue / float64(report.RoomsSold)
	}

	// RevPAR = Room Revenue / Total Rooms
	if report.TotalRooms > 0 {
		report.RevPAR = report.TotalRoomRevenue / float64(report.TotalRooms)
	}

	// Check-ins & Check-outs
	db.Model(&models.Reservation{}).
		Where("check_in_date = ? AND status IN (?, ?)", startOfDay, models.ResConfirmed, models.ResCheckedIn).
		Count(&report.CheckInsCount)

	db.Model(&models.Reservation{}).
		Where("check_out_date = ? AND status IN (?, ?)", startOfDay, models.ResCheckedIn, models.ResCheckedOut).
		Count(&report.CheckOutsCount)

	db.Model(&models.Reservation{}).
		Where("status = ?", models.ResCheckedIn).
		Count(&report.InHouseGuestsCount)

	c.JSON(http.StatusOK, gin.H{"report": report})
}

