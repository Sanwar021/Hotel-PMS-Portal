package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/database"
	"hotelos/backend/internal/middleware"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestCheckoutRejectsOutstandingBalance(t *testing.T) {
	r := setupTestRouter()
	token := getAdminAuthToken(t, r)

	var property models.Property
	var floor models.Floor
	var roomType models.RoomType
	if err := database.DB.First(&property).Error; err != nil {
		t.Fatal(err)
	}
	if err := database.DB.Where("property_id = ?", property.ID).First(&floor).Error; err != nil {
		t.Fatal(err)
	}
	if err := database.DB.Where("property_id = ?", property.ID).First(&roomType).Error; err != nil {
		t.Fatal(err)
	}

	room := models.Room{PropertyID: property.ID, FloorID: floor.ID, RoomTypeID: roomType.ID, RoomNumber: "T-" + uuid.NewString()[:8], Status: models.RoomStatusOccupied}
	if err := database.DB.Create(&room).Error; err != nil {
		t.Fatal(err)
	}
	var hotel models.Hotel
	if err := database.DB.First(&hotel, "id = ?", property.HotelID).Error; err != nil {
		t.Fatal(err)
	}
	guest := models.Guest{HotelID: hotel.ID, FirstName: "Balance", LastName: "Guard"}
	if err := database.DB.Create(&guest).Error; err != nil {
		t.Fatal(err)
	}
	res := models.Reservation{
		HotelID: hotel.ID, PropertyID: property.ID, ReservationNumber: "TEST-" + uuid.NewString()[:8], GuestID: guest.ID,
		RoomID: &room.ID, RoomTypeID: roomType.ID, CheckInDate: time.Now(), CheckOutDate: time.Now().AddDate(0, 0, 1),
		Nights: 1, Adults: 1, BookingSource: models.SourceDirect, Status: models.ResCheckedIn, BaseRate: 1000, TotalAmount: 1000,
	}
	if err := database.DB.Create(&res).Error; err != nil {
		t.Fatal(err)
	}
	folio := models.GuestFolio{ReservationID: res.ID, GuestID: guest.ID, RoomID: &room.ID, Status: models.FolioOpen, TotalCharges: 1000, Balance: 1000}
	if err := database.DB.Create(&folio).Error; err != nil {
		t.Fatal(err)
	}

	payload, _ := json.Marshal(map[string]any{"reservation_id": res.ID, "settle_payment": false})
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/frontdesk/check-out", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected unpaid checkout to return 409, got %d: %s", w.Code, w.Body.String())
	}
	database.DB.First(&res, "id = ?", res.ID)
	database.DB.First(&folio, "id = ?", folio.ID)
	if res.Status != models.ResCheckedIn || folio.Status != models.FolioOpen {
		t.Fatal("unpaid checkout changed reservation or folio state")
	}
}

func TestRestaurantRejectsNegativeQuantity(t *testing.T) {
	r := setupTestRouter()
	token := getAdminAuthToken(t, r)
	var item models.MenuItem
	if err := database.DB.First(&item).Error; err != nil {
		t.Fatal(err)
	}
	payload, _ := json.Marshal(map[string]any{"order_type": "takeaway", "items": []map[string]any{{"menu_item_id": item.ID, "quantity": -2}}})
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/restaurant/orders", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected negative quantity to return 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoleMiddlewareRejectsUnauthorizedRole(t *testing.T) {
	_ = setupTestRouter()
	cfg := config.LoadConfig()
	var receptionist models.User
	if err := database.DB.Where("role = ?", models.RoleReceptionist).First(&receptionist).Error; err != nil {
		t.Fatal(err)
	}
	token, err := middleware.GenerateToken(&receptionist, cfg.JWTSecret, cfg.JWTExpiresIn)
	if err != nil {
		t.Fatal(err)
	}
	r := gin.New()
	r.GET("/accounts-only", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole(models.RoleAccountant), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	req, _ := http.NewRequest(http.MethodGet, "/accounts-only", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected role mismatch to return 403, got %d", w.Code)
	}
}
