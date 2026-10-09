# Quick Reference Card

## Self-Maintaining APIs - Cheat Sheet

---

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/rizzzabh-06/self-maintaining-apis
cd self-maintaining-apis
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start backend
cd apps/api
uvicorn app.main:app --reload --port 8000

# 4. Start frontend (new terminal)
cd apps/web
npm install && npm run dev

# 5. Seed demo data
python tests/fixtures/demo_data_seeder.py --populate
```

---

## 📡 API Endpoints

### Core Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/repositories/github` | GET | List GitHub repos |
| `/api/repositories/connect` | POST | Connect repository |
| `/api/inventory/usages` | GET | List API usages |
| `/api/changes` | GET | Breaking changes |
| `/api/impact` | GET | Impact analysis |
| `/api/migrations/trigger` | POST | **Start migration** |
| `/api/migrations/{id}` | GET | Migration status |
| `/api/validations/{id}` | GET | Validation results |

### Trigger Migration
```bash
curl -X POST http://localhost:8000/api/migrations/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "fakepay",
    "repo_name": "demo-org/demo-checkout",
    "create_draft_pr": true
  }'
```

---

## 🛠️ Common Commands

### Backend
```bash
# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=packages --cov=apps/api

# Run specific test
pytest tests/test_migration.py::TestDeterministicMigrationPlan -v

# Start server
uvicorn app.main:app --reload --port 8000

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Demo Data
```bash
# Seed database
python tests/fixtures/demo_data_seeder.py --populate --verbose

# Clear database
python tests/fixtures/demo_data_seeder.py --clear

# Both (reset and seed)
python tests/fixtures/demo_data_seeder.py --clear && \
python tests/fixtures/demo_data_seeder.py --populate
```

---

## 🔧 Environment Variables

### Required
```bash
# Database (choose one)
DATABASE_URL=postgresql://user:pass@host/dbname

# Or use Neon
NEON_API_KEY=your_neon_api_key
NEON_PROJECT_ID=your_project_id

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# GitHub App (for PR creation)
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY=your_private_key
```

### Optional
```bash
# LLM (for unknown providers)
GEMINI_API_KEY=your_gemini_api_key

# Demo mode
GITHUB_DEMO_REPO_PATH=/path/to/demo-repo

# Environment
ENVIRONMENT=development  # or production
DEBUG=true
```

---

## 📊 Project Structure

```
self-maintaining-apis/
├── apps/
│   ├── api/              # FastAPI backend
│   │   └── app/
│   │       ├── api/routes/    # API endpoints
│   │       ├── core/          # Security, config
│   │       ├── db/            # Database setup
│   │       └── models/        # SQLAlchemy models
│   └── web/              # React frontend
│       └── src/
│           ├── api/           # API client
│           ├── components/    # React components
│           └── pages/         # Route pages
├── packages/
│   ├── change_detection/      # OpenAPI diff
│   ├── ast_discovery/         # Tree-sitter parsing
│   ├── impact_analysis/       # Risk calculation
│   ├── migration_engine/      # Recipe system
│   ├── validation/            # Sandbox testing
│   └── github_integration/    # PR creation
├── tests/
│   ├── fixtures/              # Test data
│   └── test_*.py              # Test files
├── diagrams/                  # Mermaid diagrams
└── docs/                      # Documentation
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port is in use
lsof -i :8000
# Kill process: kill -9 <PID>

# Check database connection
python -c "from apps.api.app.db.session import get_db_url; print(get_db_url())"

# Verify environment
cat .env | grep -E "(DATABASE_URL|GITHUB_)"
```

### Frontend won't start
```bash
# Check Node version (need 18+)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check port
lsof -i :5173
```

### Database errors
```bash
# Run migrations
cd apps/api
alembic upgrade head

# Check tables exist
psql $DATABASE_URL -c "\dt"

# Reset database (DANGER!)
alembic downgrade base
alembic upgrade head
```

### Migration fails
```bash
# Check logs
tail -f logs/migrations.log  # if logging configured

# Verify demo repo exists
ls -la tests/fixtures/demo-repository/

# Test seeder
python tests/fixtures/demo_data_seeder.py --clear --verbose
python tests/fixtures/demo_data_seeder.py --populate --verbose
```

### Tests failing
```bash
# Run with verbose output
pytest tests/ -vv -s

# Run single test
pytest tests/test_migration.py::TestDeterministicMigrationPlan::test_selects_fakepay_deterministic_recipe -vv

# Check test database
# Tests use in-memory SQLite by default
```

---

## 📚 Documentation Links

- **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** - Step-by-step demo script
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design deep dive
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API reference
- **[TESTING.md](./TESTING.md)** - Testing guide
- **[docs/RECIPE_GUIDE.md](./docs/RECIPE_GUIDE.md)** - Recipe development

---

## 🎯 Key Concepts

### Migration Pipeline (7 stages)
1. **Webhook** - Provider notification received
2. **Change Detection** - OpenAPI diff analysis
3. **AST Scanning** - Find exact code locations
4. **Impact Analysis** - Map changes to files
5. **Migration Planning** - Select recipe
6. **Sandbox Validation** - Test patches
7. **Draft PR** - Create pull request

### Recipe Types
- **Deterministic** - Battle-tested transforms (95-99% confidence)
- **LLM Fallback** - Gemini-assisted for unknown providers (70-85% confidence)

### Safety Invariants
1. **Draft PRs only** - Never auto-merge
2. **Sandbox validation** - Always test before PR
3. **Human review** - Required for all migrations

---

## 💡 Pro Tips

### Development
- Use `--reload` with uvicorn for auto-restart
- Enable DEBUG mode in .env for detailed logs
- Use `pytest -k keyword` to run matching tests
- Check `apps/api/app/main.py` for startup logs

### Demo Prep
- Seed data creates realistic 30-day history
- Clear browser cache before demo
- Increase terminal font to 16pt+
- Have backup screenshots ready

### Performance
- AST scanning: ~5-10 sec for 10k LOC
- Validation: ~30-60 sec (depends on test suite)
- Total migration: ~45-90 sec end-to-end

### Production
- Use gunicorn with multiple workers
- Enable connection pooling for database
- Set rate limits on public endpoints
- Monitor validation success rate

---

## 🚨 Emergency Commands

### Stop everything
```bash
# Kill all related processes
pkill -f uvicorn
pkill -f "npm run dev"
pkill -f vite
```

### Reset demo environment
```bash
# Backend
python tests/fixtures/demo_data_seeder.py --clear
alembic downgrade base && alembic upgrade head
python tests/fixtures/demo_data_seeder.py --populate

# Frontend
cd apps/web
rm -rf node_modules dist
npm install && npm run build
```

### Quick health check
```bash
# Test backend
curl http://localhost:8000/health

# Test database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM migration_runs;"

# Test frontend
curl http://localhost:5173
```

---

## 📞 Support

**Issues**: https://github.com/rizzzabh-06/self-maintaining-apis/issues  
**Discussions**: https://github.com/rizzzabh-06/self-maintaining-apis/discussions

---

## 🎓 Learning Path

1. Start with [README.md](./README.md) - Overview
2. Follow [DEMO_GUIDE.md](./DEMO_GUIDE.md) - See it work
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand design
4. Try [docs/RECIPE_GUIDE.md](./docs/RECIPE_GUIDE.md) - Build a recipe
5. Check [TESTING.md](./TESTING.md) - Add tests

---

**Last Updated**: 2026-10-09  
**Version**: 1.0.0
