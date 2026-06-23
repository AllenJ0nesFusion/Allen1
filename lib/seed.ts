import { getDb } from '@/lib/db';

function deriveParent(wbsId: string): string | null {
  const parts = wbsId.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

interface TaskRow {
  wbs_id: string;
  outline_level: number;
  lane: string;
  task_name: string;
  start_date: string | null;
  finish_date: string | null;
  duration_days: number | null;
  effort_hrs: number | null;
  owner: string | null;
  status: string;
  goals: string[];
}

const TASKS: TaskRow[] = [
  // Lane 1 - Level 1
  {
    wbs_id: '1',
    outline_level: 1,
    lane: '1 - Training Redesign',
    task_name: 'Lane 1: Training Redesign',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 1 - Level 2: Needs Assessment
  {
    wbs_id: '1.1',
    outline_level: 2,
    lane: '1 - Training Redesign',
    task_name: 'Needs Assessment',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 1 - Level 3: Needs Assessment tasks
  {
    wbs_id: '1.1.1',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Stakeholder interviews',
    start_date: '2026-06-15',
    finish_date: '2026-06-26',
    duration_days: 10,
    effort_hrs: 12,
    owner: 'Allen + Steph',
    status: 'Not Started',
    goals: ['Obj 1'],
  },
  {
    wbs_id: '1.1.2',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Compile gap analysis',
    start_date: '2026-06-29',
    finish_date: '2026-07-10',
    duration_days: 10,
    effort_hrs: 8,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 1'],
  },
  {
    wbs_id: '1.1.3',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Present findings to sponsors',
    start_date: '2026-07-13',
    finish_date: '2026-07-17',
    duration_days: 5,
    effort_hrs: 6,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 1'],
  },
  // Lane 1 - Level 2: Curriculum Design
  {
    wbs_id: '1.2',
    outline_level: 2,
    lane: '1 - Training Redesign',
    task_name: 'Curriculum Design',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 1 - Level 3: Curriculum Design tasks
  {
    wbs_id: '1.2.1',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Draft learning objectives',
    start_date: '2026-07-20',
    finish_date: '2026-07-31',
    duration_days: 10,
    effort_hrs: 16,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 1', 'Obj 2'],
  },
  {
    wbs_id: '1.2.2',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Map content to objectives',
    start_date: '2026-08-03',
    finish_date: '2026-08-14',
    duration_days: 10,
    effort_hrs: 20,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  {
    wbs_id: '1.2.3',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'SME content review',
    start_date: '2026-08-17',
    finish_date: '2026-08-28',
    duration_days: 10,
    effort_hrs: 8,
    owner: 'Allen + Steph',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  // Lane 1 - Level 2: Pilot Development
  {
    wbs_id: '1.3',
    outline_level: 2,
    lane: '1 - Training Redesign',
    task_name: 'Pilot Development',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 1 - Level 3: Pilot Development tasks
  {
    wbs_id: '1.3.1',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Build pilot module',
    start_date: '2026-09-01',
    finish_date: '2026-09-25',
    duration_days: 19,
    effort_hrs: 40,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  {
    wbs_id: '1.3.2',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Pilot delivery',
    start_date: '2026-09-28',
    finish_date: '2026-10-09',
    duration_days: 10,
    effort_hrs: 20,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  {
    wbs_id: '1.3.3',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Collect pilot feedback',
    start_date: '2026-10-12',
    finish_date: '2026-10-16',
    duration_days: 5,
    effort_hrs: 8,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  // Lane 1 - Level 2: Full Rollout
  {
    wbs_id: '1.4',
    outline_level: 2,
    lane: '1 - Training Redesign',
    task_name: 'Full Rollout',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 1 - Level 3: Full Rollout tasks
  {
    wbs_id: '1.4.1',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Revise based on feedback',
    start_date: '2026-10-19',
    finish_date: '2026-10-30',
    duration_days: 10,
    effort_hrs: 24,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 3'],
  },
  {
    wbs_id: '1.4.2',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Launch full program',
    start_date: '2026-11-02',
    finish_date: '2026-11-13',
    duration_days: 10,
    effort_hrs: 16,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 3'],
  },
  {
    wbs_id: '1.4.3',
    outline_level: 3,
    lane: '1 - Training Redesign',
    task_name: 'Post-launch evaluation',
    start_date: '2026-11-16',
    finish_date: '2026-12-04',
    duration_days: 15,
    effort_hrs: 12,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 3'],
  },
  // Lane 2 - Level 1
  {
    wbs_id: '2',
    outline_level: 1,
    lane: '2 - Certification',
    task_name: 'Lane 2: Certification',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 2 - Level 2: Certification Framework
  {
    wbs_id: '2.1',
    outline_level: 2,
    lane: '2 - Certification',
    task_name: 'Certification Framework',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 2 - Level 3: Certification Framework tasks
  {
    wbs_id: '2.1.1',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Research cert requirements',
    start_date: '2026-06-15',
    finish_date: '2026-06-26',
    duration_days: 10,
    effort_hrs: 16,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 1'],
  },
  {
    wbs_id: '2.1.2',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Define cert pathways',
    start_date: '2026-06-29',
    finish_date: '2026-07-17',
    duration_days: 15,
    effort_hrs: 20,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 1', 'Obj 2'],
  },
  {
    wbs_id: '2.1.3',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Stakeholder approval',
    start_date: '2026-07-20',
    finish_date: '2026-07-24',
    duration_days: 5,
    effort_hrs: 4,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 1'],
  },
  // Lane 2 - Level 2: Assessment Design
  {
    wbs_id: '2.2',
    outline_level: 2,
    lane: '2 - Certification',
    task_name: 'Assessment Design',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 2 - Level 3: Assessment Design tasks
  {
    wbs_id: '2.2.1',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Draft assessment items',
    start_date: '2026-07-27',
    finish_date: '2026-08-14',
    duration_days: 15,
    effort_hrs: 30,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  {
    wbs_id: '2.2.2',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Psychometric review',
    start_date: '2026-08-17',
    finish_date: '2026-08-28',
    duration_days: 10,
    effort_hrs: 8,
    owner: 'Kayla (Allen flag)',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  {
    wbs_id: '2.2.3',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Build assessment platform',
    start_date: '2026-09-01',
    finish_date: '2026-09-25',
    duration_days: 19,
    effort_hrs: 40,
    owner: 'Dylan/Isaac (Allen coord)',
    status: 'Not Started',
    goals: ['Obj 2'],
  },
  // Lane 2 - Level 2: Certification Launch
  {
    wbs_id: '2.3',
    outline_level: 2,
    lane: '2 - Certification',
    task_name: 'Certification Launch',
    start_date: null,
    finish_date: null,
    duration_days: null,
    effort_hrs: null,
    owner: null,
    status: 'Not Started',
    goals: [],
  },
  // Lane 2 - Level 3: Certification Launch tasks
  {
    wbs_id: '2.3.1',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Pilot certification cohort',
    start_date: '2026-10-05',
    finish_date: '2026-10-30',
    duration_days: 20,
    effort_hrs: 24,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 3'],
  },
  {
    wbs_id: '2.3.2',
    outline_level: 3,
    lane: '2 - Certification',
    task_name: 'Full cert program launch',
    start_date: '2026-11-02',
    finish_date: '2026-12-14',
    duration_days: 30,
    effort_hrs: 20,
    owner: 'Allen',
    status: 'Not Started',
    goals: ['Obj 3'],
  },
];

interface MilestoneRow {
  type: string;
  name: string;
  date: string;
  lane_goal: string;
  allen_role: string;
  notes: string | null;
}

const MILESTONES: MilestoneRow[] = [
  {
    type: 'US Holiday',
    name: 'Juneteenth',
    date: '2026-06-19',
    lane_goal: 'All',
    allen_role: 'N/A',
    notes: null,
  },
  {
    type: 'Internal - Decision',
    name: 'Go/No-Go: Pilot Training',
    date: '2026-07-10',
    lane_goal: 'Lane 1 - Obj 1',
    allen_role: 'Lead',
    notes: 'Requires gap analysis complete',
  },
  {
    type: 'Internal - Deadline',
    name: 'Curriculum draft due',
    date: '2026-08-14',
    lane_goal: 'Lane 1 - Obj 1 + Obj 2',
    allen_role: 'Lead',
    notes: null,
  },
  {
    type: 'External - Client',
    name: 'Client review deadline',
    date: '2026-08-14',
    lane_goal: 'Client work',
    allen_role: 'Deliver',
    notes: 'Hard deadline per contract',
  },
  {
    type: 'US Holiday',
    name: 'Labor Day',
    date: '2026-09-07',
    lane_goal: 'All',
    allen_role: 'N/A',
    notes: null,
  },
  {
    type: 'Internal - Decision',
    name: 'Cert pathway approval',
    date: '2026-07-24',
    lane_goal: 'Lane 2 - Obj 1 + Obj 2',
    allen_role: 'Lead',
    notes: null,
  },
  {
    type: 'US Holiday',
    name: 'Thanksgiving',
    date: '2026-11-26',
    lane_goal: 'All',
    allen_role: 'N/A',
    notes: null,
  },
  {
    type: 'Internal - Deadline',
    name: 'Year-end program review',
    date: '2026-12-14',
    lane_goal: 'Lane 1 - Obj 3',
    allen_role: 'Lead',
    notes: null,
  },
];

interface CapacityRow {
  week_start: string;
  week_end: string;
  available_hrs: number;
  lane1_planned: number;
  lane2_planned: number;
  notes: string | null;
}

const CAPACITY_WEEKS: CapacityRow[] = [
  { week_start: '2026-06-15', week_end: '2026-06-19', available_hrs: 20, lane1_planned: 12, lane2_planned: 4, notes: 'Kickoff week' },
  { week_start: '2026-06-22', week_end: '2026-06-26', available_hrs: 20, lane1_planned: 12, lane2_planned: 8, notes: null },
  { week_start: '2026-06-29', week_end: '2026-07-03', available_hrs: 16, lane1_planned: 8, lane2_planned: 8, notes: 'Holiday week' },
  { week_start: '2026-07-06', week_end: '2026-07-10', available_hrs: 20, lane1_planned: 10, lane2_planned: 10, notes: null },
  { week_start: '2026-07-13', week_end: '2026-07-17', available_hrs: 20, lane1_planned: 30, lane2_planned: 6, notes: 'Overloaded' },
  { week_start: '2026-07-20', week_end: '2026-07-24', available_hrs: 20, lane1_planned: 16, lane2_planned: 8, notes: null },
  { week_start: '2026-07-27', week_end: '2026-07-31', available_hrs: 20, lane1_planned: 20, lane2_planned: 12, notes: null },
  { week_start: '2026-08-03', week_end: '2026-08-07', available_hrs: 20, lane1_planned: 16, lane2_planned: 10, notes: null },
  { week_start: '2026-08-10', week_end: '2026-08-14', available_hrs: 20, lane1_planned: 16, lane2_planned: 10, notes: null },
  { week_start: '2026-08-17', week_end: '2026-08-21', available_hrs: 20, lane1_planned: 30, lane2_planned: 8, notes: 'Overloaded' },
  { week_start: '2026-08-24', week_end: '2026-08-28', available_hrs: 20, lane1_planned: 16, lane2_planned: 8, notes: null },
  { week_start: '2026-08-31', week_end: '2026-09-04', available_hrs: 0, lane1_planned: 0, lane2_planned: 0, notes: 'Delivery pause' },
  { week_start: '2026-09-07', week_end: '2026-09-11', available_hrs: 20, lane1_planned: 20, lane2_planned: 10, notes: null },
  { week_start: '2026-09-14', week_end: '2026-09-18', available_hrs: 20, lane1_planned: 24, lane2_planned: 10, notes: 'Overloaded' },
  { week_start: '2026-09-21', week_end: '2026-09-25', available_hrs: 20, lane1_planned: 20, lane2_planned: 10, notes: null },
  { week_start: '2026-09-28', week_end: '2026-10-02', available_hrs: 20, lane1_planned: 16, lane2_planned: 8, notes: null },
  { week_start: '2026-10-05', week_end: '2026-10-09', available_hrs: 20, lane1_planned: 16, lane2_planned: 12, notes: null },
  { week_start: '2026-10-12', week_end: '2026-10-16', available_hrs: 20, lane1_planned: 16, lane2_planned: 8, notes: null },
  { week_start: '2026-10-19', week_end: '2026-10-23', available_hrs: 20, lane1_planned: 24, lane2_planned: 12, notes: 'Overloaded' },
  { week_start: '2026-10-26', week_end: '2026-10-30', available_hrs: 20, lane1_planned: 16, lane2_planned: 10, notes: null },
  { week_start: '2026-11-02', week_end: '2026-11-06', available_hrs: 20, lane1_planned: 16, lane2_planned: 8, notes: null },
  { week_start: '2026-11-09', week_end: '2026-11-13', available_hrs: 20, lane1_planned: 16, lane2_planned: 8, notes: null },
  { week_start: '2026-11-16', week_end: '2026-11-20', available_hrs: 20, lane1_planned: 12, lane2_planned: 6, notes: null },
  { week_start: '2026-11-23', week_end: '2026-11-27', available_hrs: 8, lane1_planned: 0, lane2_planned: 0, notes: 'Thanksgiving week' },
  { week_start: '2026-11-30', week_end: '2026-12-04', available_hrs: 20, lane1_planned: 12, lane2_planned: 6, notes: null },
  { week_start: '2026-12-07', week_end: '2026-12-11', available_hrs: 20, lane1_planned: 24, lane2_planned: 10, notes: 'Overloaded' },
  { week_start: '2026-12-14', week_end: '2026-12-18', available_hrs: 20, lane1_planned: 12, lane2_planned: 8, notes: null },
  { week_start: '2026-12-21', week_end: '2026-12-25', available_hrs: 0, lane1_planned: 0, lane2_planned: 0, notes: 'Holiday week' },
  { week_start: '2026-12-28', week_end: '2026-12-31', available_hrs: 8, lane1_planned: 3, lane2_planned: 0, notes: 'Holiday week' },
];

export async function seedDatabase(): Promise<void> {
  try {
    const sql = getDb();

    // Ensure project_metadata table exists and check seeded_at
    await sql`CREATE TABLE IF NOT EXISTS project_metadata (
      id INT PRIMARY KEY DEFAULT 1,
      readme_content TEXT,
      seeded_at TIMESTAMPTZ
    )`;

    const rows = await sql`SELECT seeded_at FROM project_metadata WHERE id = 1`;
    if (rows.length > 0 && rows[0].seeded_at) {
      return;
    }

    // Create tables
    await sql`CREATE TABLE IF NOT EXISTS tasks (
      wbs_id VARCHAR(20) PRIMARY KEY,
      parent_wbs_id VARCHAR(20),
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
    )`;

    await sql`CREATE TABLE IF NOT EXISTS task_goals (
      wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
      goal VARCHAR(10) NOT NULL,
      PRIMARY KEY (wbs_id, goal)
    )`;

    await sql`CREATE TABLE IF NOT EXISTS milestones (
      id BIGSERIAL PRIMARY KEY,
      type VARCHAR(40) NOT NULL,
      name TEXT NOT NULL,
      date DATE NOT NULL,
      lane_goal VARCHAR(60) NOT NULL,
      allen_role VARCHAR(20) NOT NULL,
      notes TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS capacity_weeks (
      week_start DATE PRIMARY KEY,
      week_end DATE NOT NULL,
      available_hrs SMALLINT NOT NULL,
      lane1_planned SMALLINT NOT NULL DEFAULT 0,
      lane2_planned SMALLINT NOT NULL DEFAULT 0,
      notes TEXT
    )`;

    // Insert tasks
    for (const task of TASKS) {
      const parentWbsId = deriveParent(task.wbs_id);
      await sql`
        INSERT INTO tasks (wbs_id, parent_wbs_id, outline_level, lane, task_name, start_date, finish_date, duration_days, effort_hrs, owner, status, notes)
        VALUES (
          ${task.wbs_id},
          ${parentWbsId},
          ${task.outline_level},
          ${task.lane},
          ${task.task_name},
          ${task.start_date},
          ${task.finish_date},
          ${task.duration_days},
          ${task.effort_hrs},
          ${task.owner},
          ${task.status},
          ${null}
        )
        ON CONFLICT (wbs_id) DO NOTHING
      `;

      for (const goal of task.goals) {
        await sql`
          INSERT INTO task_goals (wbs_id, goal) VALUES (${task.wbs_id}, ${goal})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Insert milestones
    for (const ms of MILESTONES) {
      await sql`
        INSERT INTO milestones (type, name, date, lane_goal, allen_role, notes)
        VALUES (${ms.type}, ${ms.name}, ${ms.date}, ${ms.lane_goal}, ${ms.allen_role}, ${ms.notes})
      `;
    }

    // Insert capacity weeks
    for (const cap of CAPACITY_WEEKS) {
      await sql`
        INSERT INTO capacity_weeks (week_start, week_end, available_hrs, lane1_planned, lane2_planned, notes)
        VALUES (${cap.week_start}, ${cap.week_end}, ${cap.available_hrs}, ${cap.lane1_planned}, ${cap.lane2_planned}, ${cap.notes})
        ON CONFLICT (week_start) DO NOTHING
      `;
    }

    // Mark as seeded
    await sql`
      INSERT INTO project_metadata (id, readme_content, seeded_at)
      VALUES (1, ${null}, NOW())
      ON CONFLICT (id) DO UPDATE SET seeded_at = NOW()
    `;

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Seed error:', err);
  }
}
