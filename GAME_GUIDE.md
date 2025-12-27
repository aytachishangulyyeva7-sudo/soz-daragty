# Lingo Competition - Game Guide

## Overview
A broadcast-quality Lingo word-guessing competition web app with real-time synchronization between Admin controls and Contestant display. Perfect for live events, competitions, and game shows.

## Features

### Real-Time Synchronization
- Admin and Contestant panels sync instantly via Supabase
- 10-second countdown timer visible on both screens
- Live score updates and leaderboard

### Sound System
- **Tension Loop**: Background music that intensifies as timer counts down
- **Tick Sound**: Plays every second during final countdown (last 5 seconds)
- **Correct Answer**: Victory sound effect
- **Wrong Answer**: Buzzer sound effect
- **Winner Fanfare**: Celebration sound for game completion

### Visual Effects
- Tile flip animations reveal guess results one letter at a time
- Color-coded feedback:
  - **Green**: Correct letter in correct position
  - **Orange**: Correct letter in wrong position
  - **Gray**: Letter not in word
- "WORD FOUND!" overlay celebration
- Gradient-based dark theme with midnight blue and slate colors

## How to Use

### 1. Game Setup
1. Open the application homepage
2. Add competing groups (teams/contestants)
3. Click "Start Game" to create a new session
4. Copy the Admin and Display URLs from the modal

### 2. Admin Control Panel
**URL Format**: `?view=admin&session={SESSION_ID}`

#### Word Selection
- Choose word length (4, 5, or 6 letters)
- Filter by starting letter (optional)
- Click a word to start the round

#### Timer Control
- **Start Timer**: Begin the 10-second countdown
- **Stop Timer**: Pause the countdown
- **Reset Game**: Clear current round and start fresh

#### Guess Input
- Type the contestant's guess
- Click "Correct" if they got it right
- Click "Wrong" if they got it wrong
- System auto-calculates color feedback

#### Scoring System
- Starting points: 120
- Penalty per wrong attempt: 20 points
- Points awarded = 120 - (attempts × 20)
- Maximum 6 attempts per word

### 3. Contestant Display
**URL Format**: `?view=display&session={SESSION_ID}`

This is the main display for audiences and contestants:
- Large 6×6 grid with animated letter tiles
- Real-time countdown timer (top center)
- Live leaderboard showing all group scores
- Podium-style ranking (gold, silver, bronze)
- Full-screen "WORD FOUND!" celebration overlay

### 4. Game Flow

1. **Setup**: Admin selects a word and prepares the round
2. **Start**: Admin clicks "Start Timer" when contestant is ready
3. **Countdown**: 10-second timer appears on both screens with audio
4. **Guess**: Contestant makes their guess, Admin types it in
5. **Submit**: Admin clicks "Correct" or "Wrong"
6. **Display**: Letters flip to reveal color-coded results
7. **Repeat**: Continue until word is solved or 6 attempts used
8. **Next**: Move to next group or next round

### 5. Multi-Round Setup

The system supports multiple rounds with different word lengths:
- **Round 1**: 4-letter words
- **Round 2**: 5-letter words
- **Round 3**: 6-letter words

Admins can manually select appropriate word lengths for each round.

## Technical Architecture

### Database Schema
- **words**: Word library with length and starting letter filters
- **game_sessions**: Active game instances
- **groups**: Competing teams with scores
- **game_state**: Real-time state synced across panels
- **attempts**: History of all guesses

### Real-Time Updates
All changes sync instantly via Supabase real-time subscriptions:
- Timer state
- Guesses and results
- Scores and rankings
- Current word state

### Audio System
Built with Howler.js for reliable multi-track audio:
- Looping tension background
- One-shot sound effects
- Speed adjustment for increasing tension
- Automatic cleanup

### Animations
Framer Motion powers all visual effects:
- Staggered tile flip animations
- Smooth overlay transitions
- Scale and fade effects
- Responsive motion

## Display Setup Tips

### For Live Events
1. Open Display URL on a projector or large screen (16:9 recommended)
2. Open Admin URL on a laptop or tablet
3. Position Admin screen facing the game host
4. Ensure both have stable internet connection

### For Streaming
1. Add Display URL as browser source in OBS/streaming software
2. Set resolution to 1920×1080 for optimal quality
3. Use Admin panel off-screen for control
4. Consider adding audio output to streaming mix

### For Testing
1. Open Admin and Display in separate browser windows
2. Arrange side-by-side to see real-time sync
3. Test all features before live use

## Customization

### Adding More Words
Insert words directly into the database:
```sql
INSERT INTO words (word, length, starting_letter) VALUES
  ('HELLO', 5, 'H'),
  ('WORLD', 5, 'W');
```

### Adjusting Scoring
Modify the `round_config` in game_state table to change:
- Starting points
- Penalty amount
- Round configurations

### Color Themes
All styles use Tailwind CSS classes. Modify:
- `bg-slate-*` for backgrounds
- `text-*` for text colors
- Gradient directions for visual effects

## Troubleshooting

### Timer Not Syncing
- Check internet connection on both devices
- Refresh both Admin and Display panels
- Verify session ID matches in both URLs

### Sounds Not Playing
- Check browser audio permissions
- Unmute the display device
- Test with different browser (Chrome recommended)

### Display Not Updating
- Verify Supabase connection
- Check browser console for errors
- Ensure both panels use the same session ID

## Best Practices

1. **Test Before Going Live**: Run through a complete game before any live event
2. **Prepare Words**: Pre-filter and select words appropriate for your audience
3. **Backup Plan**: Have a secondary device ready with Admin URL
4. **Clear Instructions**: Brief contestants on game rules before starting
5. **Celebrate Wins**: Let the "WORD FOUND!" overlay play fully for maximum impact

---

Enjoy your broadcast-quality Lingo Competition! 🏆
