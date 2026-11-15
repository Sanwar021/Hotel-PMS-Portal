package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/database"
	"hotelos/backend/internal/handlers"
	"hotelos/backend/internal/middleware"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	cfg := config.LoadConfig()

	db, err := database.ConnectDB(cfg)
	if err != nil {
		panic("Failed to connect to test DB: " + err.Error())
	}
	_ = database.MigrateDB(db)
	_ = database.SeedDatabase(db)

	r := gin.New()
	r.Use(middleware.CORSMiddleware())

	v1 := r.Group("/api/v1")
	{
		v1.POST("/auth/login", handlers.LoginHandler(cfg))

		api := v1.Group("")
		api.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			api.GET("/dashboard/stats", handlers.GetDashboardStats)
			api.GET("/rooms", handlers.GetRooms)
			api.POST("/rooms", handlers.CreateRoom)
			api.GET("/reservations", handlers.GetReservations)
			api.POST("/reservations", handlers.CreateReservation)
			api.POST("/frontdesk/check-in", handlers.CheckInGuest)
			api.POST("/frontdesk/check-out", handlers.CheckOutGuest)
			api.POST("/restaurant/orders", handlers.CreateRestaurantOrder)
			api.POST("/restaurant/orders/:id/charge-to-room", handlers.ChargeOrderToRoom)
		}
	}
	return r
}

func getAdminAuthToken(t *testing.T, r *gin.Engine) string {
	loginPayload := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	body, _ := json.Marshal(loginPayload)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected login 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &res)
	return res["token"].(string)
}

func TestAuth_LoginSuccessAndFailure(t *testing.T) {
	r := setupTestRouter()

	// 1. Valid Login
	loginPayload := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	body, _ := json.Marshal(loginPayload)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// 2. Invalid Login
	invalidPayload := map[string]string{
		"username": "admin",
		"password": "wrongpassword!",
	}
	bodyInv, _ := json.Marshal(invalidPayload)
	reqInv, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(bodyInv))
	reqInv.Header.Set("Content-Type", "application/json")

	wInv := httptest.NewRecorder()
	r.ServeHTTP(wInv, reqInv)

	if wInv.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", wInv.Code)
	}
}

func TestDoubleBookingPrevention(t *testing.T) {
	r := setupTestRouter()
	token := getAdminAuthToken(t, r)

	// Pick an available room
	var room models.Room
	database.DB.First(&room, "room_number = ?", "301")

	var roomType models.RoomType
	database.DB.First(&roomType, "id = ?", room.RoomTypeID)

	// 1. Create first reservation for Room 301 from 2026-12-01 to 2026-12-05
	res1Payload := map[string]interface{}{
		"guest_first_name": "Test",
		"guest_last_name":  "Tester",
		"guest_email":      "test@example.com",
		"room_id":          room.ID,
		"room_type_id":     roomType.ID,
		"check_in_date":    "2026-12-01",
		"check_out_date":   "2026-12-05",
		"adults":           2,
		"booking_source":   "direct",
	}
	body1, _ := json.Marshal(res1Payload)
	req1, _ := http.NewRequest("POST", "/api/v1/reservations", bytes.NewBuffer(body1))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+token)

	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusCreated && w1.Code != http.StatusConflict {
		t.Fatalf("Unexpected status for res1: %d: %s", w1.Code, w1.Body.String())
	}

	// 2. Attempt overlapping reservation for the SAME Room 301 (2026-12-03 to 2026-12-07)
	res2Payload := map[string]interface{}{
		"guest_first_name": "Overlapping",
		"guest_last_name":  "Guest",
		"guest_email":      "overlap@example.com",
		"room_id":          room.ID,
		"room_type_id":     roomType.ID,
		"check_in_date":    "2026-12-03",
		"check_out_date":   "2026-12-07",
		"adults":           2,
		"booking_source":   "direct",
	}
	body2, _ := json.Marshal(res2Payload)
	req2, _ := http.NewRequest("POST", "/api/v1/reservations", bytes.NewBuffer(body2))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	// MUST be rejected with 409 Conflict!
	if w2.Code != http.StatusConflict {
		t.Errorf("CRITICAL SECURITY FLAW: Double booking was allowed! Expected 409 Conflict, got %d: %s", w2.Code, w2.Body.String())
	}
}

func TestCompleteOperationalWorkflow(t *testing.T) {
	r := setupTestRouter()
	token := getAdminAuthToken(t, r)

	// Step 1: Pick Deluxe King Room Type
	var roomType models.RoomType
	database.DB.First(&roomType, "code = ?", "DLX-K")

	todayStr := time.Now().Format("2006-01-02")
	tomorrowStr := time.Now().AddDate(0, 0, 2).Format("2006-01-02")

	// Step 2: Create a reservation (auto-assigning free room in category)
	resPayload := map[string]interface{}{
		"guest_first_name": "Amina",
		"guest_last_name":  "Karim",
		"guest_email":      "amina.karim@testworkflow.com",
		"guest_phone":      "+880 1711 888999",
		"room_type_id":     roomType.ID,
		"check_in_date":    todayStr,
		"check_out_date":   tomorrowStr,
		"adults":           1,
		"booking_source":   "direct",
		"advance_payment":  5000.00,
	}
	bodyRes, _ := json.Marshal(resPayload)
	reqRes, _ := http.NewRequest("POST", "/api/v1/reservations", bytes.NewBuffer(bodyRes))
	reqRes.Header.Set("Content-Type", "application/json")
	reqRes.Header.Set("Authorization", "Bearer "+token)

	wRes := httptest.NewRecorder()
	r.ServeHTTP(wRes, reqRes)

	if wRes.Code != http.StatusCreated {
		t.Fatalf("Failed to create reservation: %d: %s", wRes.Code, wRes.Body.String())
	}

	var resData map[string]interface{}
	json.Unmarshal(wRes.Body.Bytes(), &resData)
	resObj := resData["reservation"].(map[string]interface{})
	resIDStr := resObj["id"].(string)
	resID, _ := uuid.Parse(resIDStr)
	assignedRoomIDStr := resObj["room_id"].(string)
	assignedRoomID, _ := uuid.Parse(assignedRoomIDStr)

	// Step 3: Check-in Guest via Front Desk
	checkInPayload := map[string]interface{}{
		"reservation_id":    resID,
		"room_id":           assignedRoomID,
		"identity_verified": true,
		"notes":             "Verified via original Passport",
	}
	bodyCheckIn, _ := json.Marshal(checkInPayload)
	reqCheckIn, _ := http.NewRequest("POST", "/api/v1/frontdesk/check-in", bytes.NewBuffer(bodyCheckIn))
	reqCheckIn.Header.Set("Content-Type", "application/json")
	reqCheckIn.Header.Set("Authorization", "Bearer "+token)

	wCheckIn := httptest.NewRecorder()
	r.ServeHTTP(wCheckIn, reqCheckIn)

	if wCheckIn.Code != http.StatusOK {
		t.Fatalf("Failed to check in: %d: %s", wCheckIn.Code, wCheckIn.Body.String())
	}

	// Verify room is now occupied in DB
	var dbRoom models.Room
	database.DB.First(&dbRoom, "id = ?", assignedRoomID)
	if dbRoom.Status != models.RoomStatusOccupied {
		t.Errorf("Expected room status 'occupied', got '%s'", dbRoom.Status)
	}

	// Step 4: Restaurant POS Order & Transfer Charge to Room Folio
	var menuItem models.MenuItem
	database.DB.First(&menuItem)

	orderPayload := map[string]interface{}{
		"order_type": "room_service",
		"room_id":    assignedRoomID,
		"items": []map[string]interface{}{
			{
				"menu_item_id": menuItem.ID,
				"quantity":     2,
				"notes":        "Extra spicy",
			},
		},
	}
	bodyOrder, _ := json.Marshal(orderPayload)
	reqOrder, _ := http.NewRequest("POST", "/api/v1/restaurant/orders", bytes.NewBuffer(bodyOrder))
	reqOrder.Header.Set("Content-Type", "application/json")
	reqOrder.Header.Set("Authorization", "Bearer "+token)

	wOrder := httptest.NewRecorder()
	r.ServeHTTP(wOrder, reqOrder)

	if wOrder.Code != http.StatusCreated {
		t.Fatalf("Failed to create restaurant order: %d: %s", wOrder.Code, wOrder.Body.String())
	}

	var orderData map[string]interface{}
	json.Unmarshal(wOrder.Body.Bytes(), &orderData)
	orderObj := orderData["order"].(map[string]interface{})
	orderIDStr := orderObj["id"].(string)

	// Charge to Room
	chargePayload := map[string]interface{}{
		"room_id": assignedRoomID,
	}
	bodyCharge, _ := json.Marshal(chargePayload)
	reqCharge, _ := http.NewRequest("POST", "/api/v1/restaurant/orders/"+orderIDStr+"/charge-to-room", bytes.NewBuffer(bodyCharge))
	reqCharge.Header.Set("Content-Type", "application/json")
	reqCharge.Header.Set("Authorization", "Bearer "+token)

	wCharge := httptest.NewRecorder()
	r.ServeHTTP(wCharge, reqCharge)

	if wCharge.Code != http.StatusOK {
		t.Fatalf("Failed to charge order to room: %d: %s", wCharge.Code, wCharge.Body.String())
	}

	// Step 5: Check-out Guest
	checkOutPayload := map[string]interface{}{
		"reservation_id": resID,
		"settle_payment": true,
		"payment_method": "credit_card",
	}
	bodyCheckOut, _ := json.Marshal(checkOutPayload)
	reqCheckOut, _ := http.NewRequest("POST", "/api/v1/frontdesk/check-out", bytes.NewBuffer(bodyCheckOut))
	reqCheckOut.Header.Set("Content-Type", "application/json")
	reqCheckOut.Header.Set("Authorization", "Bearer "+token)

	wCheckOut := httptest.NewRecorder()
	r.ServeHTTP(wCheckOut, reqCheckOut)

	if wCheckOut.Code != http.StatusOK {
		t.Fatalf("Failed to check out: %d: %s", wCheckOut.Code, wCheckOut.Body.String())
	}

	// Verify room is now DIRTY in DB
	database.DB.First(&dbRoom, "id = ?", assignedRoomID)
	if dbRoom.Status != models.RoomStatusDirty {
		t.Errorf("Expected checked out room status to be 'dirty', got '%s'", dbRoom.Status)
	}

	// Verify Housekeeping Turnover Task was automatically generated!
	var hkTask models.HousekeepingTask
	err := database.DB.Where("room_id = ? AND task_type = ?", assignedRoomID, models.HKCheckoutTurnover).First(&hkTask).Error
	if err != nil {
		t.Errorf("Expected automatic housekeeping turnover task to be generated, but none found: %v", err)
	}
}
