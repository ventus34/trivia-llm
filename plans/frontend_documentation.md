# Frontend Documentation - Trivia Quiz Game

## Table of Contents
1. [Overview](#overview)
2. [Visual Design System](#visual-design-system)
3. [Board Game Mode (trivia.html)](#board-game-mode)
4. [Live Quiz Mode](#live-quiz-mode)
5. [Component Library](#component-library)
6. [State Management](#state-management)
7. [User Flows](#user-flows)
8. [Technical Architecture](#technical-architecture)

---

## Overview

The application is a dual-mode trivia game with AI-generated questions:
- **Board Game Mode**: Classic hexagonal board game for 1-10 players (like Trivial Pursuit)
- **Live Quiz Mode**: Real-time multiplayer quiz for classrooms/events with host and player views

---

## Visual Design System

### Color Palette

#### Primary Colors (Categories)
| Category | Color | Hex |
|----------|-------|-----|
| History | Blue | `#3b82f6` |
| Geography | Red | `#ef4444` |
| Science | Green | `#22c55e` |
| Art | Orange | `#f97316` |
| Sport | Purple | `#8b5cf6` |
| Entertainment | Yellow | `#facc15` |

#### Player Colors
10 distinct colors for player tokens: Red, Blue, Green, Orange, Purple, Pink, Lime, Yellow, Cyan, Indigo

#### Theme Variants

**Light Theme:**
- Background: White (`#ffffff`)
- Text: Gray 800 (`#1f2937`)
- Borders: Gray 300 (`#d1d5db`)

**Dark Theme:**
- Background: Gray 800 (`#1f2937`)
- Text: Gray 100 (`#f3f4f6`)
- Borders: Gray 600 (`#4b5563`)

**OLED Theme:**
- Background: Pure Black (`#000000`)
- Borders: Gray 900 (`#18181b`)
- Reduced brightness for AMOLED displays

### Typography

- **Font Family**: Inter (Google Fonts)
- **Base Size**: 16px (prevents iOS zoom)
- **Headings**: Bold (700), responsive sizing with clamp()
- **Body**: Regular (400) to Medium (500)
- **Small Text**: 0.875rem for labels/descriptions

### Spacing System

Uses Tailwind spacing scale:
- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

### Common Components

#### Buttons
```
Primary (themed-button):
- Background: Indigo 600 (#4f46e5)
- Hover: Indigo 700 (#3730a3)
- Text: White
- Padding: py-2 px-4
- Border Radius: rounded-md
- Transition: colors 150ms

Success:
- Background: Green 600 (#16a34a)
- Hover: Green 700 (#15803d)

Danger:
- Background: Red 600 (#dc2626)
- Hover: Red 700 (#b91c1c)
```

#### Cards/Containers
- Background: White (light) / Gray 800 (dark)
- Border Radius: rounded-2xl (1rem)
- Shadow: shadow-xl
- Padding: p-6 to p-8

#### Inputs
- Border: 1px solid Gray 300
- Border Radius: rounded-md
- Focus: ring-2 ring-blue-500
- Background: White / Gray 700 (dark)

---

## Board Game Mode

### Screen 1: Setup Screen

**Layout:**
- Centered card container (max-w-lg on mobile, max-w-5xl on desktop)
- Two-column grid on desktop (settings left, categories/players right)
- Single column stack on mobile
- Scrollable content area with fixed header

**Header:**
- Language toggle: PL/EN buttons (segmented control style)
- Title: "Ustawienia" / "Settings" (3xl font, bold, centered)

**Left Column - Game Settings:**

1. **Game Mode Selector**
   - Label: "Tryb Gry" / "Game Mode"
   - Dropdown: "Pytania zamknięte" (MCQ) or "Pytania otwarte" (Open-ended)
   - Description text below (dynamic based on selection)

2. **Knowledge Level Selector**
   - Label: "Poziom Wiedzy" / "Knowledge Level"
   - Dropdown: Basic / Intermediate / Expert
   - Description explaining difficulty

3. **Theme Input**
   - Label: "Temat do generacji kategorii"
   - Text input with placeholder
   - "Generuj" button (indigo) to AI-generate categories based on theme

4. **Toggles:**
   - Checkbox: "Dodaj temat generacji do pytań" (include theme in questions)
   - Checkbox: "Mutacja kategorii po zdobyciu punktu" (category mutation on scoring)

**Right Column - Categories & Players:**

1. **Category Preset Selector**
   - Dropdown with 24+ themed presets (General Knowledge, Poland 90s, Video Games, etc.)

2. **Category Inputs**
   - 6 textarea inputs (auto-resizing)
   - Each with colored left border matching category color
   - Sparkle button (✨) for AI category suggestions
   - Grid: 2 columns on desktop, 1 on mobile

3. **Player Setup**
   - Number input: "Liczba" (1-10 players)
   - Dynamic list of player entries:
     - Text input for name
     - Emoji picker button (opens emoji grid panel)

**Info Box (Bottom):**
- Icon: Info circle
- Sections: Mutacja Kategorii, Dodaj Temat do Pytań, Zasady Gry
- Expandable rules list

**Action Buttons:**
- "Rozpocznij grę" (primary green, full width)
- "Wczytaj ostatnią grę" (outline indigo, hidden if no save)

---

### Screen 2: Game Board

**Layout:**
- Desktop: Grid 2 columns (board left, controls right)
- Mobile: Flex column (board above, controls below)
- Full viewport height (100vh / 100dvh)

**Game Board Area:**
- Square wrapper (aspect-ratio 1:1)
- SVG layer for connection lines between squares
- Absolute-positioned divs for squares

**Board Elements:**

1. **Squares** (6% of board size each):
   - **Spoke squares**: Regular colored squares on 6 arms
   - **HQ squares**: Larger (scale 1.4), circular, at end of each arm
   - **Hub center**: Special styling with radial gradient, unicorn icon placeholder
   - **Roll Again squares**: White with dice icon
   - Colors: Match 6 category colors

2. **Connection Lines:**
   - SVG lines connecting adjacent squares
   - Gray color (dark theme: lighter gray)

3. **Player Tokens:**
   - Emoji-based (3.5% of board size)
   - Positioned absolutely on current square
   - Smooth CSS transitions for movement
   - Text shadow for visibility

**Game Controls Panel (Right Side):**

1. **Header:**
   - "Tura Gracza: [emoji]" label
   - Current player name (colored text)
   - Hamburger menu button (top right)

2. **Category Legend:**
   - 2-column grid
   - Colored dot + category name for each of 6 categories

3. **Dice Area:**
   - Result text: "Wyrzucono: X" / "Rzuć kostką, aby rozpocząć!"
   - 3D Dice container (80x80px)
   - CSS 3D cube with 6 faces
   - Pulsing animation when it's player's turn

4. **Player Scores:**
   - List of player cards
   - Each card: Emoji + Name (colored) + 6 wedge indicators
   - Wedges: Small circles showing collected categories (colored if collected)
   - Current player highlighted

5. **Game Message:**
   - Error/info text area (red text)
   - "Wybierz pole, na które chcesz się przesunąć"

---

### Screen 3: Question Modal

**Full-screen overlay** (z-index 50)

**Container:**
- Centered card, max-w-2xl
- White background, rounded-2xl, shadow-2xl
- Border-top: 4px solid category color

**Header:**
- Category name (colored text, large)
- Refresh button (top right) for new question

**Content States:**

1. **Loading State:**
   - 3 bouncing dots (indigo)
   - Text: "Generuję pytanie..."

2. **Question Display:**
   - Question text (centered, large font)
   - **MCQ Mode**: 2x2 grid of answer buttons
     - Each button: Full width, gray background, hover highlight
   - **Open Mode**: Text input + "Zatwierdź" button

---

### Screen 4: Answer Verification Popup

**Centered modal** (not full screen)

**Structure:**
- Title: "Oceń odpowiedź" / "Evaluate Answer"

**Answer Comparison:**
1. Player's Answer:
   - Label: "Odpowiedź gracza:"
   - Background: Green-100 if correct, Red-100 if incorrect

2. Correct Answer:
   - Label: "Poprawna odpowiedź:"
   - Background: Always green

3. Explanation Section:
   - Label: "Wyjaśnienie:"
   - Background: Yellow-100 (correct) / Red-100 (incorrect)
   - Shows both correct and incorrect answer explanations

**Action Buttons:**
- "Niepoprawna" (red, left)
- "Poprawna" (green, right)
- OR after selection: "Kontynuuj" + "Nowe pytanie"

---

### Screen 5: Side Menu

**Slide-out panel** (right side, 256px width)

**Items:**
- "Pokaż historię promptów" (with file icon)
- "Wczytaj grę" (with upload icon, file input)
- "Pobierz zapis" (with download icon)
- "Zacznij od nowa" (red text, with restart icon)

**Theme Switcher (Bottom):**
- Label: "Motyw"
- 3 radio buttons: ☀️ Jasny | 🌙 Ciemny | ⚫ OLED

---

### Screen 6: Winner Screen

**Centered card:**
- Large trophy/celebration icon
- "Gratulacje!" headline (yellow)
- "Zwycięzcą jest [Name]"
- "Zagraj Ponownie" button

---

## Live Quiz Mode

### Host View (live-quiz-host.html)

**Setup Screen:**
- Dark theme (forced)
- Container: max-w-4xl, centered

**Settings:**
- Knowledge Level dropdown
- Language selector (PL/EN)
- Questions per Category slider (1-10)
- Answer Time slider (30-180 seconds)
- Theme input + checkbox
- Category preset selector + "Load Preset" button
- 6 Category inputs with "Generate Categories" button

**How to Play Section:**
- 4-column grid explaining: Setup, Invite Players, During Questions, Scores & Results

**Lobby Screen:**
- Large QR code (up to 400px)
- Room code display (monospace, large)
- Player list with avatars
- "Start Game" button

**Game Screen:**
- Question text (large, centered)
- Category badge
- Timer display (countdown)
- Answer options grid (2x2)
- Player answer status list
- Controls: Pause/Resume, Extend Time, Next Question
- "Fullscreen" button for TV display

**Results Screen:**
- Correct answer highlight
- Player rankings
- Scoring breakdown

### Player View (live-quiz-player.html)

**Join Screen:**
- Room code input
- Player name input
- "Join" button

**Waiting Screen:**
- "Waiting for host..."
- Player list

**Question Screen:**
- Timer (large, top)
- Question text
- 4 answer buttons (large touch targets)
- Selected state: Blue highlight
- Disabled after selection

**Answer Feedback:**
- Correct: Green highlight + animation
- Incorrect: Red highlight
- Shows correct answer

---

## Component Library

### Notifications (Toast)

**Position:** Fixed top-right

**Types:**
- Info: Blue left border
- Success: Green left border  
- Error: Red left border

**Structure:**
- Icon (left)
- Title (bold)
- Message (regular)
- Auto-dismiss after 5s
- Slide-in/slide-out animation

### Emoji Picker

**Trigger:** Button with current emoji
**Panel:**
- Absolute positioned below button
- 6-column grid
- White background, shadow, rounded
- Click to select, closes panel

### 3D Dice

**Container:** 80x80px with perspective
**Structure:**
- 6 faces (front, back, left, right, top, bottom)
- Each face: 80x80px, white bg, black number
- 3D transforms for positioning
**Animation:**
- Random rotation during roll
- Smooth transition to final face

### Modals

**Base:**
- Fixed overlay with semi-transparent bg
- Centered container
- Scale + opacity transition

**Variants:**
- Question Modal: Full-screen, dark overlay
- Answer Popup: Centered, smaller
- Category Choice: 2x2 colored buttons
- History: Large, scrollable content
- Suggestion: List of AI options

---

## State Management

### Game State Object

```javascript
gameState = {
    currentLanguage: 'pl',      // 'pl' | 'en'
    promptHistory: [],          // Array of {prompt, response}
    gameId: string,             // Unique game ID
    players: [{
        name: string,
        emoji: string,
        position: number,       // Square ID (0-42)
        color: string,
        wedges: number[]        // Collected category indices
    }],
    categories: string[],       // 6 category names
    board: Square[],            // Board layout
    currentPlayerIndex: number,
    isAwaitingMove: boolean,
    lastAnswerWasCorrect: boolean,
    isMutationPending: boolean,
    gameMode: 'mcq' | 'short_answer',
    knowledgeLevel: 'basic' | 'intermediate' | 'expert',
    currentQuestionData: object,
    categoryTopicHistory: object, // Track asked topics
    possiblePaths: object       // Valid moves from current position
}
```

### Square Object

```javascript
Square = {
    id: number,                 // 0-42
    type: 'HUB' | 'HQ' | 'SPOKE' | 'RING' | 'ROLL_AGAIN',
    categoryIndex: number|null, // 0-5 or null
    pos: {x: number, y: number}, // Percentage positions (0-100)
    connections: number[]       // Adjacent square IDs
}
```

---

## User Flows

### Board Game Flow

```
1. Setup Screen
   └─> Select language
   └─> Choose game mode (MCQ/Open)
   └─> Set knowledge level
   └─> Enter/generate categories
   └─> Set player names/emojis
   └─> Click "Start Game"

2. Game Board
   └─> Current player rolls dice
   └─> Possible moves highlighted
   └─> Player clicks destination square
   └─> Token animates along path
   └─> Land on square:
       ├─> HQ/Spoke: Show question
       ├─> Hub: Choose category, then question
       └─> Roll Again: Extra turn

3. Question Modal
   └─> Show loading state
   └─> Display question + options
   └─> Player answers
   └─> Show verification popup

4. Answer Verification
   └─> Show player vs correct answer
   └─> Show explanation
   └─> Host clicks Correct/Incorrect
   └─> If HQ + Correct: Award wedge
   └─> Check win condition (6 wedges)

5. Win Screen
   └─> Display winner
   └─> Option to play again
```

### Live Quiz Flow

```
Host:
1. Create room with settings
2. Share QR code / room code
3. Wait for players to join
4. Start game
5. Controls: Next question, pause, extend time
6. View results after each question
7. Final rankings at end

Player:
1. Enter room code + name
2. Wait in lobby
3. Answer questions before timer ends
4. See immediate feedback
5. View score ranking
```

---

## Technical Architecture

### Module Structure

```
js/
├── config.js          # Constants, translations, presets
├── state.js           # Central game state object
├── dom.js             # DOM element references (UI object)
├── game.js            # Core game logic, API calls
├── board.js           # Board generation, move calculation
├── ui.js              # Rendering, animations, notifications
├── persistence.js     # LocalStorage save/load
├── adapter.js         # API adapter for LLM
├── utils.js           # Helper functions
├── theme.js           # Theme switching logic
└── live-quiz-*.js     # Live quiz modules
```

### Rendering Flow

1. **Initialize:**
   - Load config, set language
   - Populate category presets
   - Check for saved game

2. **Setup:**
   - Render category inputs
   - Render player name inputs
   - Update descriptions

3. **Game Start:**
   - Create board layout (42 squares)
   - Calculate connections
   - Render board squares + SVG lines
   - Render player tokens
   - Update UI panel

4. **Turn:**
   - Roll dice → animate
   - Calculate possible moves (BFS)
   - Highlight valid destinations
   - Handle square click
   - Animate token movement

5. **Question:**
   - Call API for question
   - Render modal with loader
   - Display question + options
   - Handle answer
   - Show verification

### API Integration

Endpoints used:
- `POST /api/generate-categories` - AI category generation
- `POST /api/generate-question` - Question generation
- `POST /api/get-incorrect-answer-explanation` - Open answer analysis
- `POST /api/get-category-mutation-choices` - Category mutation

### Responsive Breakpoints

- **Mobile Portrait**: < 768px, flex column
- **Mobile Landscape**: 768px+, grid layout
- **Desktop**: 1024px+, expanded controls

### CSS Architecture

- Tailwind utility classes for layout
- Custom CSS in `style.css` for:
  - CSS variables (theming)
  - 3D dice transforms
  - Complex animations
  - Dark/OLED theme overrides
  - Board-specific styles

---

## Issues & Refactoring Opportunities

### Current Issues

1. **Large Files:**
   - `ui.js` (725 lines)
   - `game.js` (502 lines)
   - `style.css` (954 lines)

2. **Code Duplication:**
   - Explanation display logic in both `game.js` and `ui.js`
   - Similar modal structures repeated

3. **Mixed Concerns:**
   - UI rendering mixed with game logic
   - API calls mixed with state updates

4. **No Component System:**
   - HTML templates are static
   - No reusable component functions

5. **Event Listeners:**
   - Some inline in HTML
   - Some in module initialization
   - Inconsistent pattern

6. **Hardcoded Strings:**
   - Some UI text not in translations object

### Proposed Refactoring (Next Steps)

1. **Component-Based Architecture:**
   - Create reusable Modal, Button, Input components
   - Extract Board, Dice, PlayerPanel as classes

2. **State Management:**
   - Centralized store with pub/sub pattern
   - Separate UI state from game state

3. **Module Organization:**
   ```
   js/
   ├── components/     # UI components
   ├── stores/         # State management
   ├── services/       # API calls
   ├── utils/          # Helpers
   └── features/       # Feature modules (board, quiz, etc.)
   ```

4. **CSS Modernization:**
   - CSS custom properties for all values
   - Container queries for board responsiveness
   - Reduce Tailwind dependency

5. **Testing:**
   - Extract pure functions for testing
   - Add Jest setup

---

*Document Version: 1.0*
*Date: 2026-01-30*
