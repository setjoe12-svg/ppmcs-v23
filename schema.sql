CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, username VARCHAR(80) UNIQUE NOT NULL, display_name VARCHAR(160) NOT NULL,
  role VARCHAR(80) NOT NULL, password_hash TEXT NOT NULL, active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(20) PRIMARY KEY, name VARCHAR(180) NOT NULL, sector VARCHAR(120), manager VARCHAR(160),
  start_date DATE, finish_date DATE, budget NUMERIC(18,2) DEFAULT 0, actual_cost NUMERIC(18,2) DEFAULT 0,
  planned_pct NUMERIC(6,2) DEFAULT 0, actual_pct NUMERIC(6,2) DEFAULT 0, earned_value NUMERIC(18,2) DEFAULT 0,
  forecast_cost NUMERIC(18,2) DEFAULT 0, status VARCHAR(40) DEFAULT 'On Track', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS wbs_activities (
  id SERIAL PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  wbs_code VARCHAR(40), activity_name VARCHAR(240), weight NUMERIC(8,4) DEFAULT 0,
  planned_pct NUMERIC(6,2) DEFAULT 0, actual_pct NUMERIC(6,2) DEFAULT 0,
  planned_qty NUMERIC(18,3), actual_qty NUMERIC(18,3), unit VARCHAR(20), status VARCHAR(40) DEFAULT 'Not Started'
);
CREATE TABLE IF NOT EXISTS daily_reports (
  id BIGSERIAL PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id), report_date DATE NOT NULL,
  location VARCHAR(240), activity VARCHAR(240), planned_qty NUMERIC(18,3), actual_qty NUMERIC(18,3), unit VARCHAR(20),
  manpower TEXT, equipment TEXT, weather VARCHAR(80), remarks TEXT, created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS project_risks (
  id VARCHAR(30) PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id), issue TEXT NOT NULL,
  severity VARCHAR(40), due_date DATE, owner VARCHAR(160), status VARCHAR(40) DEFAULT 'Open'
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), action VARCHAR(80), entity_type VARCHAR(80),
  entity_id VARCHAR(80), metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_photos (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  activity_chainage VARCHAR(240),
  description TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  image_data TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date ON daily_reports(project_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_photos_project_date ON project_photos(project_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS qa_inspections (
  id BIGSERIAL PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL, location VARCHAR(240), activity VARCHAR(240),
  inspector VARCHAR(160), result VARCHAR(40) DEFAULT 'Pending', test_type VARCHAR(160),
  remarks TEXT, created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ncrs (
  id VARCHAR(40) PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(240) NOT NULL, severity VARCHAR(40), status VARCHAR(40) DEFAULT 'Open',
  due_date DATE, owner VARCHAR(160), corrective_action TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS hse_events (
  id BIGSERIAL PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  event_date DATE NOT NULL, event_type VARCHAR(80), severity VARCHAR(40),
  location VARCHAR(240), description TEXT, status VARCHAR(40) DEFAULT 'Open',
  created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cost_transactions (
  id BIGSERIAL PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL, category VARCHAR(120), description TEXT,
  committed NUMERIC(18,2) DEFAULT 0, actual NUMERIC(18,2) DEFAULT 0,
  created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS management_actions (
  id BIGSERIAL PRIMARY KEY, project_id VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL, owner VARCHAR(160), due_date DATE, priority VARCHAR(40) DEFAULT 'Medium',
  status VARCHAR(40) DEFAULT 'Open', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_users (
  id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(200), department VARCHAR(160), permissions JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_qa_project_date ON qa_inspections(project_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_ncr_project_status ON ncrs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_hse_project_date ON hse_events(project_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_cost_project_date ON cost_transactions(project_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_actions_project_status ON management_actions(project_id, status);
