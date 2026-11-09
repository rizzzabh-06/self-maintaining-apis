#!/usr/bin/env bash
# =============================================================================
# dev_with_ngrok.sh — Start the full local dev stack + ngrok tunnel
#
# Usage:
#   ./scripts/dev_with_ngrok.sh [--port 8000] [--frontend-port 5173]
#
# What this does:
#   1. Starts the FastAPI backend on BACKEND_PORT (default 8000)
#   2. Starts the React/Vite frontend on FRONTEND_PORT (default 5173)
#   3. Launches an ngrok HTTP tunnel pointing at the backend
#   4. Prints the public ngrok URL and the exact webhook URL to paste into
#      your GitHub App settings
#   5. Cleans up all child processes on SIGINT (Ctrl-C)
# =============================================================================
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ---- colour helpers ---------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[ngrok-dev]${NC} $*"; }
success() { echo -e "${GREEN}[ngrok-dev]${NC} $*"; }
warn()    { echo -e "${YELLOW}[ngrok-dev]${NC} $*"; }
error()   { echo -e "${RED}[ngrok-dev]${NC} $*" >&2; }

# ---- sanity checks ----------------------------------------------------------
command -v ngrok   >/dev/null 2>&1 || { error "ngrok not found. Install with: brew install ngrok/ngrok/ngrok"; exit 1; }
command -v uvicorn >/dev/null 2>&1 || { error "uvicorn not found. Activate your .venv first: source .venv/bin/activate"; exit 1; }
command -v npm     >/dev/null 2>&1 || { error "npm not found."; exit 1; }

cd "$PROJECT_ROOT"

# Load .env so GITHUB_WEBHOOK_SECRET is available in subshells
if [[ -f .env ]]; then
    set -o allexport
    # shellcheck disable=SC2046
    source <(grep -v '^\s*#' .env | grep -v '^\s*$')
    set +o allexport
    info "Loaded .env"
fi

# Parse flags
RESTART_EXISTING=false
for arg in "$@"; do
    case "$arg" in
        --restart|--force|-f)
            RESTART_EXISTING=true
            ;;
    esac
done

# ---- cleanup on exit --------------------------------------------------------
PIDS=()
cleanup() {
    echo ""
    warn "Shutting down..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    # Kill any lingering ngrok process we started
    pkill -f "ngrok http ${BACKEND_PORT}" 2>/dev/null || true
    success "All script-managed processes stopped. Goodbye!"
}
trap cleanup EXIT INT TERM

# ---- 1. Check / Start backend -----------------------------------------------
if lsof -ti ":$BACKEND_PORT" >/dev/null 2>&1; then
    EXISTING_BACKEND_PID=$(lsof -ti ":$BACKEND_PORT" | head -1)
    if [ "$RESTART_EXISTING" = true ]; then
        warn "Restart flag passed: killing existing process on port ${BACKEND_PORT} (PID ${EXISTING_BACKEND_PID})..."
        kill -9 $(lsof -ti ":$BACKEND_PORT") 2>/dev/null || true
        sleep 1
    else
        success "Backend already running on port ${BACKEND_PORT} (PID ${EXISTING_BACKEND_PID}) — reusing it."
    fi
fi

if ! lsof -ti ":$BACKEND_PORT" >/dev/null 2>&1; then
    info "Starting FastAPI backend on port ${BACKEND_PORT}..."
    PYTHONPATH="$PROJECT_ROOT" uvicorn apps.api.app.main:app \
        --reload \
        --port "$BACKEND_PORT" \
        --log-level info \
        > "$PROJECT_ROOT/.backend.log" 2>&1 &
    BACKEND_PID=$!
    PIDS+=("$BACKEND_PID")
    info "Backend PID: ${BACKEND_PID} → tail -f .backend.log"

    # Give the backend a moment to bind
    sleep 2
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        error "Backend failed to start. Check .backend.log"
        cat "$PROJECT_ROOT/.backend.log" | tail -20
        exit 1
    fi
fi
success "Backend is ready at http://localhost:${BACKEND_PORT}"

# ---- 2. Check / Start frontend ----------------------------------------------
if lsof -ti ":$FRONTEND_PORT" >/dev/null 2>&1; then
    EXISTING_FRONTEND_PID=$(lsof -ti ":$FRONTEND_PORT" | head -1)
    if [ "$RESTART_EXISTING" = true ]; then
        warn "Restart flag passed: killing existing process on port ${FRONTEND_PORT} (PID ${EXISTING_FRONTEND_PID})..."
        kill -9 $(lsof -ti ":$FRONTEND_PORT") 2>/dev/null || true
        sleep 1
    else
        success "Frontend already running on port ${FRONTEND_PORT} (PID ${EXISTING_FRONTEND_PID}) — reusing it."
    fi
fi

if ! lsof -ti ":$FRONTEND_PORT" >/dev/null 2>&1; then
    info "Starting Vite dev server on port ${FRONTEND_PORT}..."
    (cd "$PROJECT_ROOT/apps/web" && npm run dev -- --port "$FRONTEND_PORT") \
        > "$PROJECT_ROOT/.frontend.log" 2>&1 &
    FRONTEND_PID=$!
    PIDS+=("$FRONTEND_PID")
    info "Frontend PID: ${FRONTEND_PID} → tail -f .frontend.log"
fi
success "Frontend is ready at http://localhost:${FRONTEND_PORT}"

# ---- 3. Start ngrok tunnel --------------------------------------------------
info "Starting ngrok tunnel → http://localhost:${BACKEND_PORT}..."
ngrok http "$BACKEND_PORT" \
    --log=stdout \
    --log-format=json \
    > "$PROJECT_ROOT/.ngrok.log" 2>&1 &
NGROK_PID=$!
PIDS+=("$NGROK_PID")

# Poll the ngrok local API for the public URL (up to 15 s)
NGROK_URL=""
for i in $(seq 1 30); do
    sleep 0.5
    NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
        | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    for t in tunnels:
        if t.get('proto') == 'https':
            print(t['public_url'])
            break
except Exception:
    pass
" 2>/dev/null || true)
    [[ -n "$NGROK_URL" ]] && break
done

if [[ -z "$NGROK_URL" ]]; then
    warn "Could not auto-detect ngrok URL. Check .ngrok.log"
    warn "Run: curl http://127.0.0.1:4040/api/tunnels | python3 -m json.tool"
else
    WEBHOOK_URL="${NGROK_URL}/webhooks/github"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            🚀  ngrok tunnel is LIVE                         ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Public URL  : ${CYAN}${NGROK_URL}${NC}"
    echo -e "${GREEN}║${NC}  Webhook URL : ${YELLOW}${WEBHOOK_URL}${NC}"
    echo -e "${GREEN}║${NC}  Web UI      : ${CYAN}http://127.0.0.1:4040${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Paste Webhook URL into:                                     "
    echo -e "${GREEN}║${NC}  GitHub App Settings → General → Webhook URL                 "
    echo -e "${GREEN}║${NC}  (also set Webhook secret = GITHUB_WEBHOOK_SECRET in .env)   "
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Write the URL to .env.ngrok for other scripts to source
    echo "NGROK_PUBLIC_URL=${NGROK_URL}" > "$PROJECT_ROOT/.env.ngrok"
    echo "GITHUB_WEBHOOK_URL=${WEBHOOK_URL}" >> "$PROJECT_ROOT/.env.ngrok"
    info "Saved tunnel URLs to .env.ngrok"
fi

# ---- 4. Health check --------------------------------------------------------
sleep 1
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${BACKEND_PORT}/health" || echo "000")
if [[ "$HTTP_STATUS" == "200" ]]; then
    success "Backend health check OK (HTTP 200)"
else
    warn "Backend health check returned HTTP ${HTTP_STATUS} — check .backend.log"
fi

echo ""
info "Press Ctrl-C to stop all processes."
echo ""

# ---- 5. Wait for all children -----------------------------------------------
wait

