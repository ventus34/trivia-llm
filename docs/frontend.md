# Frontend

The frontend is served directly by FastAPI. It is a vanilla JS application with modular files under [js/](js/) and HTML templates under [templates/](templates/).

## Templates
- Trivia board UI: [templates/trivia.html](templates/trivia.html)
- Live quiz host: [templates/live-quiz-host.html](templates/live-quiz-host.html)
- Live quiz player: [templates/live-quiz-player.html](templates/live-quiz-player.html)
- Database browser: [templates/db.html](templates/db.html)

Partials are in [templates/partials/](templates/partials/).

## JS Structure (Trivia)
Key modules:
- [js/trivia/main.js](js/trivia/main.js): app bootstrap
- [js/trivia/game-flow.js](js/trivia/game-flow.js): turn/phase logic
- [js/trivia/board.js](js/trivia/board.js): board layout and movement
- [js/trivia/game-api.js](js/trivia/game-api.js): API calls
- [js/trivia/store.js](js/trivia/store.js): state store
- [js/trivia/ui-*.js](js/trivia/): UI rendering and handlers

## JS Structure (Live Quiz)
Key modules:
- [js/live-quiz/live-quiz-host-main.js](js/live-quiz/live-quiz-host-main.js)
- [js/live-quiz/live-quiz-player.js](js/live-quiz/live-quiz-player.js)
- [js/live-quiz/live-quiz-player-api.js](js/live-quiz/live-quiz-player-api.js)
- [js/live-quiz/live-quiz-common.js](js/live-quiz/live-quiz-common.js)

## Styling
- Global styles: [style.css](style.css)
- Additional styles: [css/](css/)
- Theme handling: [js/theme.js](js/theme.js)

## Frontend Build
There is no bundler step. Static files are served as-is by the backend.
