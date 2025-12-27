# Söz Daragty - Setup Instructions

Complete setup guide for the offline realtime multiplayer Lingo game with Redis Pub/Sub synchronization.

## Prerequisites

1. **Node.js** (v16 or later)
2. **Docker** (for local Redis server)
3. **npm** or **yarn**

---

## Step 1: Install Docker and Start Redis

### On macOS/Linux:

```bash
# Install Docker from https://www.docker.com/get-started

# Start Redis container
docker run --name local-redis -p 6379:6379 -d redis:latest

# Verify Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it local-redis redis-cli ping
```

Expected output: `PONG`

### On Windows:

1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
2. Open PowerShell or Command Prompt as Administrator
3. Run:

```powershell
docker run --name local-redis -p 6379:6379 -d redis:latest
docker ps
```

### Redis Management (Optional):

```bash
# Stop Redis
docker stop local-redis

# Start Redis (after stopping)
docker start local-redis

# Remove Redis container
docker rm local-redis
```

---

## Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

This installs:
- **express**: HTTP server for health checks
- **ws**: WebSocket server for realtime communication
- **ioredis**: Redis client for Pub/Sub

---

## Step 3: Start the Backend Server

```bash
cd backend
npm start
```

Expected output:

```
HTTP server running on http://localhost:3001
WebSocket server running on ws://localhost:8080
Waiting for Redis connection...
Connected to Redis
Subscribed to 1 channel(s)
```

**Leave this terminal running!** The backend must stay active for realtime sync.

---

## Step 4: Install Frontend Dependencies

Open a **new terminal** (keep backend running):

```bash
cd ..  # Back to project root
npm install
```

---

## Step 5: Start the Frontend

```bash
npm run dev
```

Expected output:

```
VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 6: Test the Setup

1. **Open Admin Panel**: http://localhost:5173/?view=admin&session=test-123
2. **Open Contestant Display** (in a different browser tab): http://localhost:5173/?view=display&session=test-123
3. **Test Realtime Sync**:
   - In Admin, click "Timer Başlat" (Start Timer)
   - Contestant display should immediately show the timer without refresh
   - Try pausing, resuming, and submitting guesses

---

## Architecture Overview

```
┌─────────────────┐         WebSocket         ┌─────────────────┐
│  Admin Panel    │◄──────────────────────────►│                 │
│ (localhost:5173)│                            │  Backend Server │
└─────────────────┘                            │  ws://localhost:│
                                               │      8080       │
┌─────────────────┐                            │                 │
│Contestant Display│◄──────────────────────────►│  Redis Pub/Sub  │
│ (localhost:5173)│                            │  localhost:6379 │
└─────────────────┘                            └─────────────────┘

Local SQLite DB (sql.js + localforage) synced via WebSocket
```

---

## How It Works

1. **Admin makes a change** (e.g., starts timer, submits guess)
2. **localDb.ts** saves to local SQLite and calls `sendUpdate()`
3. **WebSocketClient.ts** sends message to backend server
4. **Backend server** publishes to Redis `game-updates` channel
5. **Redis** broadcasts to all subscribed WebSocket clients
6. **All connected tabs** receive the message and reload data
7. **Contestant display updates** in real-time (<50ms)

---

## Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
docker ps | grep redis

# If not, start it
docker start local-redis

# Check logs
docker logs local-redis
```

### WebSocket Connection Failed

1. Ensure backend server is running: `cd backend && npm start`
2. Check console for errors
3. Verify port 8080 is not in use: `lsof -i :8080` (macOS/Linux)

### No Realtime Updates

1. **Check browser console** for WebSocket errors
2. **Verify backend logs** show "New WebSocket client connected"
3. **Test Redis**: `docker exec -it local-redis redis-cli ping`
4. **Restart backend** and refresh browser tabs

### Database Not Saving

1. **Check browser console** for IndexedDB errors
2. **Clear browser data** (localStorage, IndexedDB)
3. **Restart frontend**: `npm run dev`

---

## Game Flow Summary

### Timer Changes (30 Seconds)
- Timer is now 30 seconds (changed from 16)
- **Pause**: Shows "⏸ XX" with remaining seconds
- **Resume**: Continues from exact remaining time
- **Wrong guess**: Automatically resumes with full 30 seconds for new attempt

### Sound System
- **Tension music**: Plays continuously when game active (volume 1.0 when timer active, 0.5 when paused)
- **Ticking**: Starts immediately when timer active (no delay)
- **Correct/Wrong sounds**: Stop tension music temporarily

### Yellow/Present Logic Fix
- Proper Wordle-style duplicate letter handling
- Example: Target "AAB", Guess "AAA" → green, green, gray (extra A is gray)

### Failed Word Overlay
- After 6 attempts with no correct guess
- Red overlay shows: "SÖZ [word] BOLMALYDY!" for 3 seconds
- Then persistent "Ýalňyş: [word]" below scoreboard

---

## Production Notes

This setup is for **local/offline development and testing**. For production:

1. Replace Redis with a cloud service (e.g., Redis Cloud, AWS ElastiCache)
2. Deploy backend to cloud platform (Heroku, AWS, DigitalOcean)
3. Update WebSocket URL in `src/utils/WebSocketClient.ts`
4. Add authentication and security measures
5. Use PostgreSQL or another persistent database instead of SQLite

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend terminal for logs
3. Verify Redis is running: `docker ps`
4. Test health endpoint: http://localhost:3001/health

Enjoy your ultra-smooth realtime Söz Daragty game!
