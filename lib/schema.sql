CREATE TABLE IF NOT EXISTS project_metadata (
  id INT PRIMARY KEY DEFAULT 1,
  readme_content TEXT,
  seeded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
  wbs_id VARCHAR(20) PRIMARY KEY,
  parent_wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
  outline_level SMALLINT NOT NULL,
  lane VARCHAR(60) NOT NULL,
  task_name TEXT NOT NULL,
  start_date DATE,
  finish_date DATE,
  duration_days SMALLINT,
  effort_hrs SMALLINT,
  owner VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'Not Started',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_goals (
  wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
  goal VARCHAR(10) NOT NULL,
  PRIMARY KEY (wbs_id, goal)
);

CREATE TABLE IF NOT EXISTS milestones (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  lane_goal VARCHAR(60) NOT NULL,
  allen_role VARCHAR(20) NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS capacity_weeks (
  week_start DATE PRIMARY KEY,
  week_end DATE NOT NULL,
  available_hrs SMALLINT NOT NULL,
  lane1_planned SMALLINT NOT NULL DEFAULT 0,
  lane2_planned SMALLINT NOT NULL DEFAULT 0,
  notes TEXT
);
