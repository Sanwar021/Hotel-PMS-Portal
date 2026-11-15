package handlers

import (
	"net/http"
	"time"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
)

type DashboardStats struct {
	TotalRooms          int64   `json:"total_rooms"`
	AvailableRooms      int64   `json:"available_rooms"`
	OccupiedRooms       int64   `json:"occupied_rooms"`
	ReservedRooms       int64   `json:"reserved_rooms"`
	DirtyRooms          int64   `json:"dirty_rooms"`
	MaintenanceRooms    int64   `json:"maintenance_rooms"`
	CleaningRooms       int64   `json:"cleaning_rooms"`
	TodayCheckIns       int64   `json:"today_check_ins"`
	TodayCheckOuts      int64   `json:"today_check_outs"`
	CurrentGuests       int64   `json:"current_guests"`
	TodayRevenue        float64 `json:"today_revenue"`
	MonthlyRevenue      float64 `json:"monthly_revenue"`
	OutstandingBalance  float64 `json:"outstanding_balance"`
	OccupancyPercentage float64 `json:"occupancy_percentage"`
	ADR                 float64 `json:"adr"`
	RevPAR              float64 `json:"revpar"`
}

type RevenueChartPoint struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Rooms   int64   `json:"rooms"`
}

type SourceBreakdown struct {
	Source string `json:"source"`
	Count  int64  `json:"count"`
}

func GetDashboardStats(c *gin.Context) {
	db := database.DB
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.AddDate(0, 0, 1)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var stats DashboardStats

	// Room status counts
	db.Model(&models.Room{}).Count(&stats.TotalRooms)
	db.Model(&models.Room{}).Where("status = ?", models.RoomStatusAvailable).Count(&stats.AvailableRooms)
	db.Model(&models.Room{}).Where("status = ?", models.RoomStatusOccupied).Count(&stats.OccupiedRooms)
	db.Model(&models.Room{}).Where("status = ?", models.RoomStatusReserved).Count(&stats.ReservedRooms)
	db.Model(&models.Room{}).Where("status = ?", models.RoomStatusDirty).Count(&stats.DirtyRooms)
	db.Model(&models.Room{}).Where("status = ?", models.RoomStatusMaintenance).Count(&stats.MaintenanceRooms)
	db.Model(&models.Room{}).Where("status = ?", models.RoomStatusCleaning).Count(&stats.CleaningRooms)

	// Today's Check-ins (arrivals with check_in_date = today)
	db.Model(&models.Reservation{}).
		Where("check_in_date = ? AND status IN (?, ?)", todayStart, models.ResConfirmed, models.ResCheckedIn).
		Count(&stats.TodayCheckIns)

	// Today's Check-outs (departures with check_out_date = today)
	db.Model(&models.Reservation{}).
		Where("check_out_date = ? AND status IN (?, ?)", todayStart, models.ResCheckedIn, models.ResCheckedOut).
		Count(&stats.TodayCheckOuts)

	// Current in-house guests
	db.Model(&models.Reservation{}).
		Where("status = ?", models.ResCheckedIn).
		Count(&stats.CurrentGuests)

	// Today's Payments Revenue
	var todayRev float64
	db.Model(&models.Payment{}).
		Where("status = ? AND created_at >= ? AND created_at < ?", models.PaymentCompleted, todayStart, todayEnd).
		Select("COALESCE(SUM(amount), 0)").Scan(&todayRev)
	stats.TodayRevenue = todayRev

	// Monthly Revenue
	var monthRev float64
	db.Model(&models.Payment{}).
		Where("status = ? AND created_at >= ?", models.PaymentCompleted, monthStart).
		Select("COALESCE(SUM(amount), 0)").Scan(&monthRev)
	stats.MonthlyRevenue = monthRev

	// Outstanding balance on open folios
	var outBal float64
	db.Model(&models.GuestFolio{}).
		Where("status = ?", models.FolioOpen).
		Select("COALESCE(SUM(balance), 0)").Scan(&outBal)
	stats.OutstandingBalance = outBal

	// Occupancy %
	if stats.TotalRooms > 0 {
		stats.OccupancyPercentage = float64(stats.OccupiedRooms) / float64(stats.TotalRooms) * 100.0
	}

	// ADR = In-house Room Revenue / Occupied Rooms
	var inHouseRevenue float64
	db.Model(&models.Reservation{}).
		Where("status = ?", models.ResCheckedIn).
		Select("COALESCE(SUM(base_rate), 0)").Scan(&inHouseRevenue)

	if stats.OccupiedRooms > 0 {
		stats.ADR = inHouseRevenue / float64(stats.OccupiedRooms)
	} else {
		stats.ADR = 0
	}

	// RevPAR = In-house Room Revenue / Total Rooms
	if stats.TotalRooms > 0 {
		stats.RevPAR = inHouseRevenue / float64(stats.TotalRooms)
	}

	// 7-day Revenue Trend
	var revenueTrend []RevenueChartPoint
	for i := 6; i >= 0; i-- {
		d := todayStart.AddDate(0, 0, -i)
		dNext := d.AddDate(0, 0, 1)

		var dayRev float64
		db.Model(&models.Payment{}).
			Where("status = ? AND created_at >= ? AND created_at < ?", models.PaymentCompleted, d, dNext).
			Select("COALESCE(SUM(amount), 0)").Scan(&dayRev)

		var occCount int64
		db.Model(&models.Reservation{}).
			Where("check_in_date <= ? AND check_out_date > ? AND status IN (?, ?)", d, d, models.ResCheckedIn, models.ResCheckedOut).
			Count(&occCount)

		revenueTrend = append(revenueTrend, RevenueChartPoint{
			Date:    d.Format("Jan 02"),
			Revenue: dayRev,
			Rooms:   occCount,
		})
	}

	// Source breakdown
	var sources []SourceBreakdown
	db.Model(&models.Reservation{}).
		Select("booking_source as source, count(*) as count").
		Group("booking_source").
		Scan(&sources)

	// Recent Reservations
	var recentRes []models.Reservation
	db.Preload("Guest").Preload("Room").Preload("RoomType").
		Order("created_at desc").Limit(8).Find(&recentRes)

	// Upcoming Arrivals
	var arrivals []models.Reservation
	db.Preload("Guest").Preload("RoomType").
		Where("check_in_date >= ? AND status = ?", todayStart, models.ResConfirmed).
		Order("check_in_date asc").Limit(6).Find(&arrivals)

	// Upcoming Departures
	var departures []models.Reservation
	db.Preload("Guest").Preload("Room").
		Where("check_out_date >= ? AND status = ?", todayStart, models.ResCheckedIn).
		Order("check_out_date asc").Limit(6).Find(&departures)

	// System Notifications
	var notifications []models.Notification
	db.Order("created_at desc").Limit(5).Find(&notifications)

	c.JSON(http.StatusOK, gin.H{
		"stats":               stats,
		"revenue_trend":       revenueTrend,
		"source_breakdown":    sources,
		"recent_reservations": recentRes,
		"upcoming_arrivals":   arrivals,
		"upcoming_departures": departures,
		"notifications":       notifications,
	})
}
