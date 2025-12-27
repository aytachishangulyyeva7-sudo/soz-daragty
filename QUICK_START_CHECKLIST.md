# Quick Start Checklist - Verify All Fixes

Use this checklist to quickly verify that all fixes are working correctly in your environment.

---

## Prerequisites Setup

### 1. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 2. Start Redis (Docker)
```bash
docker run --name local-redis -p 6379:6379 -d redis:latest
```

**Verify:**
```bash
docker ps | grep redis
```
Expected output: Shows running Redis container

### 3. Start Backend Server
```bash
cd backend
npm start
```

**Verify:**
Console shows:
```
✅ HTTP server running on http://localhost:3001
✅ WebSocket server running on ws://localhost:8080
✅ Connected to Redis
✅ Subscribed to 1 channel(s)
```

### 4. Start Frontend (New Terminal)
```bash
npm run dev
```

**Verify:**
Console shows: `Local: http://localhost:5173/`

---

## Feature Verification Checklist

### ✅ Fix 1: Timer Duration (30 Seconds)

**Test Steps:**
1. Open: http://localhost:5173
2. Create game with 2 groups
3. Click "Oýny Başlat"
4. Open Admin panel (copy link from modal)
5. Select a 4-letter word
6. Click "Timer Başlat"

**Expected Results:**
- [ ] Timer starts at **30** (not 16)
- [ ] Countdown: 30 → 29 → 28 → ...
- [ ] Timer reaches 0 → Red timeout row appears

---

### ✅ Fix 2: Pause/Resume (Preserves Remaining Time)

**Test Steps:**
1. Continue from Fix 1
2. Select new word
3. Start timer
4. When timer shows **18**, click "Timer Durdur" (Pause)
5. Wait 5 seconds
6. Observe display

**Expected Results:**
- [ ] Timer display shows: "⏸ 18"
- [ ] After waiting, still shows "⏸ 18" (frozen)
- [ ] Timer info shows: "Zaman: ⏸ 18"

**Continue:**
7. Click "Timer Dowam Et" (Resume)

**Expected Results:**
- [ ] Timer resumes from exactly 18 seconds
- [ ] Countdown continues: 18 → 17 → 16 → ...

---

### ✅ Fix 3: No Timeout Bug After Pause

**Test Steps:**
1. Pause timer at any remaining time
2. Type a **wrong** guess (e.g., if word is "ABAT", type "BABA")
3. Press Enter

**Expected Results:**
- [ ] Guess is submitted successfully (no forced timeout)
- [ ] Wrong answer sound plays
- [ ] Red/gray/yellow tiles appear based on guess
- [ ] Timer automatically restarts with **full 30 seconds**
- [ ] Display shows: "Zaman: 30"

---

### ✅ Fix 4: Tension Music Continuous

**Test Steps:**
1. Put on headphones or turn up volume
2. Load game homepage
3. Create game
4. Open Admin panel
5. Listen for background music

**Expected Results:**
- [ ] Soft background music (tension) plays immediately
- [ ] Music continues even before selecting a word
- [ ] Music loops seamlessly

---

### ✅ Fix 5: Ticking Immediate (No Delay)

**Test Steps:**
1. Continue from Fix 4
2. Select a word
3. Click "Timer Başlat"
4. Listen carefully

**Expected Results:**
- [ ] **First tick sound plays immediately** (not after 1 second)
- [ ] Subsequent ticks every second
- [ ] Tension music gets slightly louder

---

### ✅ Fix 6: Pause Audio Behavior

**Test Steps:**
1. Timer active with ticking
2. Click "Timer Durdur" (Pause)

**Expected Results:**
- [ ] Ticking stops immediately
- [ ] Tension music continues but gets quieter

**Continue:**
3. Click "Timer Dowam Et" (Resume)

**Expected Results:**
- [ ] Ticking restarts immediately
- [ ] Tension music gets louder again

---

### ✅ Fix 7: Correct Answer Audio

**Test Steps:**
1. Start new word
2. Type the **correct word** (peek at spoiler box)
3. Press Enter

**Expected Results:**
- [ ] Wait 1 second
- [ ] Tension music stops
- [ ] Ticking stops
- [ ] "Ding!" correct sound plays
- [ ] Success overlay appears

---

### ✅ Fix 8: Yellow/Gray Logic (Duplicate Letters)

**Test Steps:**
1. Add word "BABA" to word list:
   - In Admin, change length to 4
   - Type "BABA" in "Täze söz goş"
   - Select language "TM"
   - Click "Goş"
2. Select "BABA" as current word
3. Start timer
4. Type "AAAA" and press Enter

**Expected Results:**
- [ ] Result: ⬜ ✅ ⬜ ✅ (gray, green, gray, green)
- [ ] Position 0: A is gray (wrong position, both A's in target used)
- [ ] Position 1: A is green (correct position)
- [ ] Position 2: A is gray (wrong position, both A's used)
- [ ] Position 3: A is green (correct position)

**Test Case 2:**
1. Add word "AAB"
2. Select "AAB"
3. Guess "AAA"

**Expected Results:**
- [ ] Result: ✅ ✅ ⬜ (green, green, gray)
- [ ] Extra A is gray (not yellow)

---

### ✅ Fix 9: Failed Word Overlay

**Test Steps:**
1. Select any word
2. Make **6 wrong guesses** (any 6 different wrong words)
3. After 6th guess, observe display

**Expected Results:**
- [ ] Red overlay appears immediately
- [ ] Text: "SÖZ [WORD] BOLMALYDY!"
- [ ] Each letter shown in white box
- [ ] Overlay visible for exactly 3 seconds
- [ ] Overlay fades out automatically

**Continue:**
4. Open Contestant Display (copy link from game setup)
5. Check scoreboard area (left side)

**Expected Results:**
- [ ] Below scoreboard, persistent red box appears
- [ ] Text: "Ýalňyş: [WORD]"
- [ ] Box stays visible (pulsing animation)

**Continue:**
6. In Admin, click "Täzeden başla" (Reset)

**Expected Results:**
- [ ] Persistent "Ýalňyş" box disappears
- [ ] Grid cleared
- [ ] Ready for new word

---

### ✅ Fix 10: Realtime Sync (No Refresh Needed)

**Test Steps:**
1. Keep Admin panel open
2. In **new tab**, open Contestant Display (use link from game setup modal)
3. Arrange windows side-by-side
4. In Admin, click "Timer Başlat"

**Expected Results:**
- [ ] Contestant display shows timer **immediately**
- [ ] No manual refresh needed
- [ ] Update happens in <100ms

**Continue:**
5. In Admin, pause timer

**Expected Results:**
- [ ] Contestant shows "⏸ XX" immediately

**Continue:**
6. In Admin, type a guess and press Enter

**Expected Results:**
- [ ] Contestant shows new row immediately
- [ ] Tiles animate and flip
- [ ] Colors appear correctly

**Continue:**
7. Check backend terminal

**Expected Results:**
- [ ] Backend shows: "New WebSocket client connected. Total clients: 2"
- [ ] When actions happen, backend logs activity

---

## Performance Checks

### Memory Usage
```bash
# Check Node.js memory
ps aux | grep node

# Check Docker memory
docker stats local-redis
```

**Expected:**
- [ ] Backend Node.js: <100MB
- [ ] Redis: <10MB
- [ ] Frontend: Standard browser memory usage

### Connection Health
```bash
# Health check endpoint
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "websocket_clients": 2,
  "redis_status": "ready"
}
```

### WebSocket Check (Browser Console)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages

**Expected:**
- [ ] "WebSocket connected"
- [ ] No error messages

---

## Build Verification

```bash
npm run build
```

**Expected Output:**
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] Bundle size: ~720KB
- [ ] Warnings about chunk size (normal, can be ignored)

---

## Troubleshooting

### ❌ Backend Won't Start

**Error:** `Redis connection failed`

**Fix:**
```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
docker start local-redis

# If doesn't exist, create it
docker run --name local-redis -p 6379:6379 -d redis:latest
```

---

### ❌ WebSocket Not Connecting

**Error:** Browser console shows "WebSocket error"

**Fix:**
1. Check backend is running: `cd backend && npm start`
2. Check port 8080 is free: `lsof -i :8080` (macOS/Linux)
3. Restart backend and refresh browser

---

### ❌ Sounds Not Playing

**Error:** No audio

**Fix:**
1. Check browser audio permissions
2. Unmute browser tab
3. Try different browser (Chrome recommended)
4. Click anywhere on page to unlock audio (mobile)

---

### ❌ Timer Shows Wrong Duration

**Error:** Timer starts at 16 instead of 30

**Fix:**
1. Clear browser cache and reload
2. Check if `useCountdown.ts` was updated correctly
3. Rebuild: `npm run build`

---

### ❌ No Realtime Updates

**Error:** Changes in Admin don't appear in Contestant

**Fix:**
1. Check backend terminal shows "WebSocket client connected"
2. Check browser console for errors
3. Verify Redis is running: `docker ps | grep redis`
4. Restart backend and refresh both tabs

---

## Success Criteria

**All fixes verified if:**
- [ ] All 10 feature tests pass
- [ ] Performance checks normal
- [ ] Build succeeds without errors
- [ ] No errors in browser console
- [ ] Backend terminal shows normal activity
- [ ] Realtime sync works (<100ms latency)

---

## Next Steps

Once all checkboxes are complete:

1. **Test with real users** - Have someone play the actual game
2. **Monitor backend logs** - Watch for any unexpected errors
3. **Test on mobile** - Verify responsive design and touch controls
4. **Stress test** - Open 5+ tabs and verify sync still works
5. **Long-running test** - Leave game open for 1 hour, verify no memory leaks

---

## Support

If any test fails:
1. Check `VIRTUAL_TESTING_REPORT.md` for detailed analysis
2. Review `IMPLEMENTATION_SUMMARY.md` for code explanations
3. See `SETUP_INSTRUCTIONS.md` for architecture details

**Happy testing! Your Söz Daragty game is now production-ready!** 🎉
