import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

function excelDateToDate(serial: number | string | Date | null | undefined): string | null {
  if (!serial) return null;
  if (serial instanceof Date) return serial.toISOString().split('T')[0];
  if (typeof serial === 'string') {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
  }
  if (typeof serial === 'number') {
    const date = XLSX.SSF.parse_date_code(serial);
    if (!date) return null;
    const y = date.y;
    const m = String(date.m).padStart(2, '0');
    const d = String(date.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function deriveParent(wbsId: string): string | null {
  const parts = wbsId.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

function parseGoals(goalStr: string | null | undefined): string[] {
  if (!goalStr) return [];
  return goalStr
    .split(/\s*\+\s*/)
    .map((g) => g.trim())
    .filter((g) => /^Obj \d+$/.test(g));
}

export async function seedDatabase(): Promise<void> {
  try {
    // Check if already seeded
    await sql`CREATE TABLE IF NOT EXISTS project_metadata (
      id INT PRIMARY KEY DEFAULT 1,
      readme_content TEXT,
      seeded_at TIMESTAMPTZ
    )`;

    const result = await sql`SELECT seeded_at FROM project_metadata WHERE id = 1`;
    if (result.rows.length > 0 && result.rows[0].seeded_at) {
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

    const xlsxPath = path.join(process.cwd(), 'seed-data', 'Allen_Jones_WBS_2026.xlsx');
    if (!fs.existsSync(xlsxPath)) {
      console.error('Seed file not found:', xlsxPath);
      return;
    }

    const workbook = XLSX.readFile(xlsxPath);

    // --- README sheet ---
    const readmeSheet = workbook.Sheets['README'];
    let readmeText = '';
    if (readmeSheet) {
      readmeText = XLSX.utils.sheet_to_csv(readmeSheet);
    }

    // --- Tasks sheet ---
    const tasksSheet = workbook.Sheets['Tasks'];
    const tasksRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(tasksSheet, { defval: null });

    const taskRows = tasksRaw.filter((row) => {
      const wbsId = row['WBS ID'];
      const duration = row['Duration (days)'];
      return wbsId && typeof wbsId === 'string' && wbsId.trim() !== '' && duration !== 'TOTAL';
    });

    for (const row of taskRows) {
      const wbsId = String(row['WBS ID']).trim();
      const outlineLevel = Number(row['Outline Level']) || 1;
      const lane = String(row['Lane'] || '').trim();
      const taskName = String(row['Task Name'] || '').trim();
      const startDate = excelDateToDate(row['Start Date'] as number | string | null);
      const finishDate = excelDateToDate(row['Finish Date'] as number | string | null);
      const durationRaw = row['Duration (days)'];
      const durationDays = durationRaw && typeof durationRaw === 'number' ? durationRaw : null;
      const effortRaw = row['Effort (Allen hrs)'];
      const effortHrs = effortRaw && typeof effortRaw === 'number' ? effortRaw : null;
      const owner = row['Owner'] ? String(row['Owner']).trim() : null;
      const status = row['Status'] ? String(row['Status']).trim() : 'Not Started';
      const notes = row['Notes'] ? String(row['Notes']).trim() : null;
      const parentWbsId = deriveParent(wbsId);
      const goalStr = row['Goal'] ? String(row['Goal']) : null;

      await sql`
        INSERT INTO tasks (wbs_id, parent_wbs_id, outline_level, lane, task_name, start_date, finish_date, duration_days, effort_hrs, owner, status, notes)
        VALUES (${wbsId}, ${parentWbsId}, ${outlineLevel}, ${lane}, ${taskName}, ${startDate}, ${finishDate}, ${durationDays}, ${effortHrs}, ${owner}, ${status}, ${notes})
        ON CONFLICT (wbs_id) DO NOTHING
      `;

      const goals = parseGoals(goalStr);
      for (const goal of goals) {
        await sql`
          INSERT INTO task_goals (wbs_id, goal) VALUES (${wbsId}, ${goal})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // --- Milestones sheet ---
    const msSheet = workbook.Sheets['Milestones'];
    if (msSheet) {
      const msRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(msSheet, { defval: null });
      for (const row of msRaw) {
        const name = row['Name'] ? String(row['Name']).trim() : null;
        if (!name) continue;
        const type = String(row['Type'] || '').trim();
        const date = excelDateToDate(row['Date'] as number | string | null);
        const laneGoal = String(row['Lane / Goal'] || '').trim();
        const allenRole = String(row['Allen Role'] || '').trim();
        const notes = row['Notes'] ? String(row['Notes']).trim() : null;
        if (!date) continue;
        await sql`
          INSERT INTO milestones (type, name, date, lane_goal, allen_role, notes)
          VALUES (${type}, ${name}, ${date}, ${laneGoal}, ${allenRole}, ${notes})
        `;
      }
    }

    // --- Capacity sheet ---
    const capSheet = workbook.Sheets['Capacity'];
    if (capSheet) {
      const capRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(capSheet, { defval: null });
      for (const row of capRaw) {
        const weekStart = excelDateToDate(row['Week Start (Mon)'] as number | string | null);
        if (!weekStart) continue;
        const weekEnd = excelDateToDate(row['Week End (Fri)'] as number | string | null);
        if (!weekEnd) continue;
        const availHrs = Number(row['Allen Available Hrs']) || 0;
        const lane1 = Number(row['Lane 1 Planned']) || 0;
        const lane2 = Number(row['Lane 2 Planned']) || 0;
        const notes = row['Notes / Constraints'] ? String(row['Notes / Constraints']).trim() : null;
        await sql`
          INSERT INTO capacity_weeks (week_start, week_end, available_hrs, lane1_planned, lane2_planned, notes)
          VALUES (${weekStart}, ${weekEnd}, ${availHrs}, ${lane1}, ${lane2}, ${notes})
          ON CONFLICT (week_start) DO NOTHING
        `;
      }
    }

    // Mark as seeded
    await sql`
      INSERT INTO project_metadata (id, readme_content, seeded_at)
      VALUES (1, ${readmeText}, NOW())
      ON CONFLICT (id) DO UPDATE SET readme_content = EXCLUDED.readme_content, seeded_at = NOW()
    `;

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Seed error:', err);
  }
}
