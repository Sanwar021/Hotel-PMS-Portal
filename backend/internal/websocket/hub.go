package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev / intranet
	},
}

type Message struct {
	Type    string      `json:"type"` // e.g. "RESERVATION_CREATED", "ROOM_STATUS_CHANGED", "PAYMENT_RECORDED"
	Payload interface{} `json:"payload"`
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

var GlobalHub *Hub

func InitHub(cfg *config.Config) *Hub {
	GlobalHub = &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	go GlobalHub.run()
	go listenForDatabaseEvents(cfg, GlobalHub)
	return GlobalHub
}

func listenForDatabaseEvents(cfg *config.Config, hub *Hub) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)
	for {
		conn, err := pgx.Connect(context.Background(), dsn)
		if err != nil {
			log.Printf("Realtime database listener unavailable: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}
		if _, err = conn.Exec(context.Background(), "LISTEN hotelos_events"); err != nil {
			conn.Close(context.Background())
			time.Sleep(5 * time.Second)
			continue
		}
		for {
			notification, waitErr := conn.WaitForNotification(context.Background())
			if waitErr != nil {
				break
			}
			var message Message
			if json.Unmarshal([]byte(notification.Payload), &message) == nil {
				hub.broadcast <- message
			}
		}
		conn.Close(context.Background())
		time.Sleep(time.Second)
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Println("WebSocket client connected. Active clients:", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Println("WebSocket client disconnected. Active clients:", len(h.clients))

		case msg := <-h.broadcast:
			data, err := json.Marshal(msg)
			if err != nil {
				continue
			}

			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- data:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func BroadcastEvent(eventType string, payload interface{}) {
	if GlobalHub != nil {
		message := Message{
			Type:    eventType,
			Payload: payload,
		}
		if data, err := json.Marshal(message); err == nil && database.DB != nil {
			if result := database.DB.Exec("SELECT pg_notify('hotelos_events', ?)", string(data)); result.Error == nil {
				return
			}
		}
		GlobalHub.broadcast <- message
	}
}

func ServeWS(hub *Hub, jwtSecret, allowedOrigin string, c *gin.Context) {
	tokenString := c.Query("token")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "WebSocket authentication required"})
		return
	}
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, http.ErrNotSupported
		}
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired WebSocket token"})
		return
	}
	origin := c.GetHeader("Origin")
	if origin != "" && allowedOrigin != "*" && !strings.EqualFold(strings.TrimRight(origin, "/"), strings.TrimRight(allowedOrigin, "/")) {
		c.JSON(http.StatusForbidden, gin.H{"error": "WebSocket origin is not allowed"})
		return
	}
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade websocket:", err)
		return
	}

	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
	hub.register <- client

	// Writer pump
	go func() {
		defer func() {
			conn.Close()
		}()
		for message := range client.send {
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
				break
			}
		}
	}()

	// Reader pump
	go func() {
		defer func() {
			hub.unregister <- client
			conn.Close()
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}
