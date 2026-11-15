package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestParseNIDText(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/identity/nid/parse", ParseNIDText)

	payload, _ := json.Marshal(map[string]string{"raw_text": "Government of Bangladesh\nName: Amina Rahman\nDate of Birth: 17/08/1992\nNID No: 1987654321098\nAddress: Gulshan, Dhaka"})
	request := httptest.NewRequest(http.MethodPost, "/identity/nid/parse", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", response.Code, response.Body.String())
	}
	var result struct {
		Identity NIDParseResult `json:"identity"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Identity.FirstName != "Amina" || result.Identity.LastName != "Rahman" {
		t.Fatalf("unexpected parsed name: %#v", result.Identity)
	}
	if result.Identity.IDNumber != "1987654321098" || result.Identity.DateOfBirth != "1992-08-17" {
		t.Fatalf("unexpected parsed identity values: %#v", result.Identity)
	}
}
