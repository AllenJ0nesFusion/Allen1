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
  notes: string | null;
  goals: string[];
}

interface MilestoneRow {
  type: string;
  name: string;
  date: string;
  lane_goal: string;
  allen_role: string;
  notes: string | null;
}

interface CapacityRow {
  week_start: string;
  week_end: string;
  available_hrs: number;
  lane1_planned: number;
  lane2_planned: number;
  notes: string | null;
}

const TASKS: TaskRow[] = [
  {
    "wbs_id": "1",
    "outline_level": 1,
    "lane": "1 - Training Redesign",
    "task_name": "LANE 1 — Training Redesign (Pharmacy prototype + Docebo co-lead)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "In Progress",
    "notes": "Pharmacy = prototype; IDHS 9/14 = proof point; FusionEHR Q4 = first EHR application of pattern.",
    "goals": [
      "Obj 1",
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.1",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "Pharmacy framework + IDHS scope lock",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen / Kayla",
    "status": "In Progress",
    "notes": null,
    "goals": []
  },
  {
    "wbs_id": "1.1.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Kayla GO/NO-GO decision on pharmacy redesign approach",
    "start_date": "2026-06-15",
    "finish_date": "2026-06-22",
    "duration_days": 6,
    "effort_hrs": 1,
    "owner": "Kayla (Allen flag)",
    "status": "Decision Required",
    "notes": "UNSOLICITED work sent 6/14-6/15: framework + Prescriber facilitator guide + learner packet + pharmacy L1/L2 study guides. Kayla has NOT given direction. The ask is a directional yes/no, NOT detailed feedback. Lane 1 pharmacy redesign (1.1.2-1.6.5) AND pharmacy assessment (2.4.x) are CONTINGENT on this decision. Decision point: next 1:1 (Mon 6/22).",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.1.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Lock template per Kayla feedback",
    "start_date": "2026-06-29",
    "finish_date": "2026-07-02",
    "duration_days": 4,
    "effort_hrs": 6,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Lock structure: ILT redesign + facilitator guide + learner packet (Tip Guide replacement) + eLearning pre-req + JIT job aid.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.1.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Confirm IDHS Pilot Wave 1 roles attending",
    "start_date": "2026-06-22",
    "finish_date": "2026-06-26",
    "duration_days": 5,
    "effort_hrs": 2,
    "owner": "Allen + Steph",
    "status": "Not Started",
    "notes": "Determines minimum prototype scope. Likely Prescriber + 1 other (Pharmacist/Nurse). Ask Steph + Dylan.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.1.4",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Scope MVP: 2 roles E2E by 9/14, rest in Q4",
    "start_date": "2026-06-29",
    "finish_date": "2026-07-03",
    "duration_days": 5,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Trade scope for quality: 2 roles fully built by IDHS, remaining 3 in Q4. Document the scope cut explicitly.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.2",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "Pharmacy prototype — Role 1 (Prescriber, anchor)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Anchor role — pattern emerges from this build.",
    "goals": []
  },
  {
    "wbs_id": "1.2.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "ILT facilitator guide redesign — Prescriber",
    "start_date": "2026-07-06",
    "finish_date": "2026-07-24",
    "duration_days": 15,
    "effort_hrs": 18,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Build on 6/14 sample. Scenario-driven, decision-based, knowledge checks that surface job consequences.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.2.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Learner packet — Prescriber (Tip Guide replacement)",
    "start_date": "2026-07-27",
    "finish_date": "2026-08-07",
    "duration_days": 10,
    "effort_hrs": 12,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Replaces legacy Tip Guides. Job-aid format, role-aligned, workflow-anchored.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.2.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "eLearning pre-req design + storyboard — Prescriber",
    "start_date": "2026-07-27",
    "finish_date": "2026-08-14",
    "duration_days": 15,
    "effort_hrs": 20,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Parallel with 1.2.2. This is the Obj 3 'interactive, adult-learning-based module' deliverable.",
    "goals": [
      "Obj 1",
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.2.4",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "JIT job aid design — Prescriber",
    "start_date": "2026-08-03",
    "finish_date": "2026-08-14",
    "duration_days": 10,
    "effort_hrs": 10,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Just-in-time micro-aids for at-workstation use during real work.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.2.5",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "SME accuracy review — Prescriber (Dylan/Isaac)",
    "start_date": "2026-08-17",
    "finish_date": "2026-08-28",
    "duration_days": 10,
    "effort_hrs": 4,
    "owner": "Dylan/Isaac (Allen coord)",
    "status": "Contingent",
    "notes": "Pharmacy SMEs (Dylan/Isaac), NOT Dom. Independent of Dom queue.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.2.6",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Final revisions — Prescriber",
    "start_date": "2026-08-31",
    "finish_date": "2026-09-04",
    "duration_days": 5,
    "effort_hrs": 6,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.3",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "Pharmacy prototype — Role 2 (TBD: confirm at 1.1.3)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Mirror Role 1 build, faster with pattern in hand.",
    "goals": []
  },
  {
    "wbs_id": "1.3.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "ILT facilitator guide redesign — Role 2",
    "start_date": "2026-07-20",
    "finish_date": "2026-08-07",
    "duration_days": 15,
    "effort_hrs": 14,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Lag Prescriber by ~2 weeks so pattern is established.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.3.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Learner packet — Role 2",
    "start_date": "2026-08-10",
    "finish_date": "2026-08-21",
    "duration_days": 10,
    "effort_hrs": 10,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.3.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "eLearning pre-req design + storyboard — Role 2",
    "start_date": "2026-08-10",
    "finish_date": "2026-08-28",
    "duration_days": 15,
    "effort_hrs": 16,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.3.4",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "JIT job aid design — Role 2",
    "start_date": "2026-08-17",
    "finish_date": "2026-08-28",
    "duration_days": 10,
    "effort_hrs": 8,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.3.5",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "SME accuracy review — Role 2",
    "start_date": "2026-08-31",
    "finish_date": "2026-09-11",
    "duration_days": 10,
    "effort_hrs": 4,
    "owner": "Dylan/Isaac (Allen coord)",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.3.6",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Final revisions — Role 2",
    "start_date": "2026-09-08",
    "finish_date": "2026-09-11",
    "duration_days": 4,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.4",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "Build Pattern doc (scaffolding for Steph + future authors)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Output layer (modules) + scaffolding layer (this). Without scaffolding, 'try to do things like Allen did' produces a polished user-manual dump.",
    "goals": []
  },
  {
    "wbs_id": "1.4.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Draft pattern structure (intro → scenario → KC → application → assessment)",
    "start_date": "2026-07-27",
    "finish_date": "2026-08-07",
    "duration_days": 10,
    "effort_hrs": 8,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.4.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Document decision rules (async vs ILT, scenario vs explanation)",
    "start_date": "2026-08-10",
    "finish_date": "2026-08-21",
    "duration_days": 10,
    "effort_hrs": 8,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.4.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Annotated example walk-through using Prescriber as exemplar",
    "start_date": "2026-08-24",
    "finish_date": "2026-09-04",
    "duration_days": 10,
    "effort_hrs": 6,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.5",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "IDHS Sept 14 proof point",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Pharmacy handoff (Kayla B's Obj 2) lands here via prototype delivery.",
    "goals": []
  },
  {
    "wbs_id": "1.5.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Delivery prep & run-through",
    "start_date": "2026-09-08",
    "finish_date": "2026-09-11",
    "duration_days": 4,
    "effort_hrs": 8,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "1.5.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "IDHS Pilot Wave 1 delivery (pharmacy)",
    "start_date": "2026-09-14",
    "finish_date": "2026-09-18",
    "duration_days": 5,
    "effort_hrs": 30,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "30 hrs delivery = pharmacy handoff proof. Counted as Lane 1 work this week, displaces other dept hours.",
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "1.5.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Post-delivery retro & pattern refinement",
    "start_date": "2026-09-21",
    "finish_date": "2026-09-25",
    "duration_days": 5,
    "effort_hrs": 6,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.6",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "Pharmacy remaining roles (Q4 build, post-proof)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Steph",
    "status": "Not Started",
    "notes": "Roles 3-5 using proven pattern. Lighter effort/role.",
    "goals": []
  },
  {
    "wbs_id": "1.6.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Roles 3-5 build using proven pattern",
    "start_date": "2026-09-28",
    "finish_date": "2026-11-13",
    "duration_days": 35,
    "effort_hrs": 60,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.6.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "SME accuracy pass (remaining roles)",
    "start_date": "2026-11-16",
    "finish_date": "2026-11-27",
    "duration_days": 10,
    "effort_hrs": 6,
    "owner": "Dylan/Isaac (Allen coord)",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.6.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Steph publishes pharmacy modules to Docebo",
    "start_date": "2026-11-30",
    "finish_date": "2026-12-11",
    "duration_days": 10,
    "effort_hrs": 0,
    "owner": "Steph",
    "status": "Contingent",
    "notes": "0 hrs Allen — Steph builds from Allen's authored content per build pattern.",
    "goals": [
      "Obj 1",
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.6.4",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Allen QA on Steph's published modules",
    "start_date": "2026-11-30",
    "finish_date": "2026-12-11",
    "duration_days": 10,
    "effort_hrs": 8,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Pattern enforcement. Parallel with publish.",
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.6.5",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Pharmacy suite launch",
    "start_date": "2026-12-14",
    "finish_date": "2026-12-18",
    "duration_days": 5,
    "effort_hrs": 4,
    "owner": "Allen + Steph",
    "status": "Contingent",
    "notes": "Full pharmacy LMS suite live. Closes Steph's Obj 1 'Pharmacy LMS trainings' line.",
    "goals": [
      "Obj 1"
    ]
  },
  {
    "wbs_id": "1.7",
    "outline_level": 2,
    "lane": "1 - Training Redesign",
    "task_name": "Docebo co-lead with Steph (Obj 3 — Workstream A)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Steph",
    "status": "Not Started",
    "notes": "Steph leads backend (taxonomy, dashboards, publishing). Allen co-leads ID design + pattern enforcement.",
    "goals": []
  },
  {
    "wbs_id": "1.7.1",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Current-state audit — role gap mapping contribution",
    "start_date": "2026-06-22",
    "finish_date": "2026-07-03",
    "duration_days": 10,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Steph back from HI week of 6/22. Allen contributes role-gap analysis; Steph handles inventory + usage data.",
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.7.2",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Role-based taxonomy design with Steph",
    "start_date": "2026-07-06",
    "finish_date": "2026-07-24",
    "duration_days": 15,
    "effort_hrs": 10,
    "owner": "Allen + Steph",
    "status": "Not Started",
    "notes": "Lock taxonomy before Steph's FusionEHR build starts (8/21). Otherwise FusionEHR gets retrofitted later.",
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.7.3",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Pattern enforcement — FusionEHR build review (Steph)",
    "start_date": "2026-08-17",
    "finish_date": "2026-08-21",
    "duration_days": 5,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "First Steph build using new pattern. Spot-check + redirect if needed.",
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "1.7.4",
    "outline_level": 3,
    "lane": "1 - Training Redesign",
    "task_name": "Ongoing build pattern reviews (eMAR, Order Mgr, CPOE, Lab Mgr)",
    "start_date": "2026-09-28",
    "finish_date": "2026-12-31",
    "duration_days": 69,
    "effort_hrs": 12,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Rolling: eMAR ~10/2, Order Mgr ~11/6, CPOE ~12/4, Lab Mgr ~1/1/27. 3 hrs per review.",
    "goals": [
      "Obj 3"
    ]
  },
  {
    "wbs_id": "2",
    "outline_level": 1,
    "lane": "2 - Certification",
    "task_name": "LANE 2 — Certification / Assessment",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "In Progress",
    "notes": "EHR cert program is the spine. Team / Contractor / Pharmacy / Client Ops are deployments to populations.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.1",
    "outline_level": 2,
    "lane": "2 - Certification",
    "task_name": "EHR L1+L2 study guide & cert program design",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Dom",
    "status": "In Progress",
    "notes": "Load-bearing for all of Lane 2 — every downstream deployment uses this design.",
    "goals": []
  },
  {
    "wbs_id": "2.1.1",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Dom SME review of L1 + L2 (waiting + escalation if needed)",
    "start_date": "2026-06-16",
    "finish_date": "2026-07-03",
    "duration_days": 14,
    "effort_hrs": 2,
    "owner": "Dom (Allen monitor)",
    "status": "Waiting",
    "notes": "L1 with Dom ~13 days no movement. L2 added 6/16. ESCALATE TO KAYLA if no response by EOW 6/19.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.1.2",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Incorporate Dom feedback into L1 + L2",
    "start_date": "2026-07-06",
    "finish_date": "2026-07-17",
    "duration_days": 10,
    "effort_hrs": 12,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.1.3",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Lock cert program structure (scoring, retake, renewal policy)",
    "start_date": "2026-07-20",
    "finish_date": "2026-07-31",
    "duration_days": 10,
    "effort_hrs": 8,
    "owner": "Allen + Kayla + Adam",
    "status": "Not Started",
    "notes": "Define 'Phase 1' bar for both G (contractor) and I (Client Ops) so year-end measurement is unambiguous.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.2",
    "outline_level": 2,
    "lane": "2 - Certification",
    "task_name": "Team product knowledge ≥90% (target 8/31)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Kayla",
    "status": "Not Started",
    "notes": "Tracker reads 'End Q2' — confirm extension to 8/31.",
    "goals": []
  },
  {
    "wbs_id": "2.2.1",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Team enrollment & comms",
    "start_date": "2026-07-27",
    "finish_date": "2026-07-31",
    "duration_days": 5,
    "effort_hrs": 2,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.2.2",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Team study window",
    "start_date": "2026-08-03",
    "finish_date": "2026-08-14",
    "duration_days": 10,
    "effort_hrs": 0,
    "owner": "L&D team self-study",
    "status": "Not Started",
    "notes": "0 hrs Allen.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.2.3",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Assessment delivery + scoring",
    "start_date": "2026-08-17",
    "finish_date": "2026-08-21",
    "duration_days": 5,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.2.4",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Remediation for anyone <90% (cohort retake)",
    "start_date": "2026-08-24",
    "finish_date": "2026-08-28",
    "duration_days": 5,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Aug 31 deadline. If Dom slips and 2.1.x compresses, F target is the first to break.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3",
    "outline_level": 2,
    "lane": "2 - Certification",
    "task_name": "Contractor cert Phase 1 (Q3 + rolling pre-assignment)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Kayla B",
    "status": "In Progress",
    "notes": "Rolling: 100% certified before each contractor's first Q3 assignment.",
    "goals": []
  },
  {
    "wbs_id": "2.3.1",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Q3 contractor-to-assignment map (RI DOC 6/29, DC DYRS 7/27, IL DOC SU 8/17, IDHS 9/14)",
    "start_date": "2026-06-22",
    "finish_date": "2026-06-26",
    "duration_days": 5,
    "effort_hrs": 3,
    "owner": "Allen + Kayla B + Adam",
    "status": "Not Started",
    "notes": "Critical visibility task. Raise at tomorrow's L&D Weekly. Connects to AB Staffing risk on Pharmacy Adoption slide.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3.2",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Pre-Phase-1 exception decisions (e.g., RI DOC Maurice 6/29)",
    "start_date": "2026-06-22",
    "finish_date": "2026-06-26",
    "duration_days": 5,
    "effort_hrs": 1,
    "owner": "Allen + Kayla",
    "status": "Not Started",
    "notes": "Maurice delivers RI DOC week of 6/29 — too early for Phase 1 cert. Decide: carve-out or scope shifts forward.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3.3",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Contractor cert curriculum design (uses 2.1 outputs)",
    "start_date": "2026-07-06",
    "finish_date": "2026-07-24",
    "duration_days": 15,
    "effort_hrs": 16,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3.4",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Cohort 1 — DC DYRS contractors (cert before 7/27)",
    "start_date": "2026-07-13",
    "finish_date": "2026-07-24",
    "duration_days": 10,
    "effort_hrs": 8,
    "owner": "Allen + contractors",
    "status": "Not Started",
    "notes": "Compressed window. May need accelerated cert or exception.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3.5",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Cohort 2 — IL DOC SU contractors (cert before 8/17)",
    "start_date": "2026-07-27",
    "finish_date": "2026-08-14",
    "duration_days": 15,
    "effort_hrs": 8,
    "owner": "Allen + contractors",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3.6",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Cohort 3 — IDHS contractors incl. AB Staffing (cert before 9/14)",
    "start_date": "2026-08-17",
    "finish_date": "2026-09-11",
    "duration_days": 20,
    "effort_hrs": 8,
    "owner": "Allen + contractors",
    "status": "Not Started",
    "notes": "Addresses AB Staffing (Bricen, Jason) risk on Pharmacy Adoption slide.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.3.7",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Phase 1 launch package documented",
    "start_date": "2026-09-14",
    "finish_date": "2026-09-25",
    "duration_days": 10,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Curriculum + assessment + attestation tracker. Closes G goal by 9/30.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.4",
    "outline_level": 2,
    "lane": "2 - Certification",
    "task_name": "Pharmacy assessment (cert tied to prototype)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Dylan/Isaac",
    "status": "In Progress",
    "notes": "Pharmacy study guides L1/L2 sent 6/15 (CIPS, CIPS Remote, sMARt). SME review = Dylan/Isaac (Pharmacy Support), NOT Dom.",
    "goals": []
  },
  {
    "wbs_id": "2.4.1",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Pharmacy L1/L2 study guides SME review (Dylan/Isaac)",
    "start_date": "2026-06-22",
    "finish_date": "2026-07-17",
    "duration_days": 20,
    "effort_hrs": 4,
    "owner": "Dylan/Isaac (Allen coord)",
    "status": "Contingent",
    "notes": "Pharmacy guides sent 6/15 to Kayla. Routes through Dylan/Isaac as pharmacy SMEs, NOT Dom (Dom = EHR-side curriculum review). Independent of Dom queue — can move in parallel.",
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.4.2",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Pharmacy cert structure decision (sub-cert under EHR? or standalone?)",
    "start_date": "2026-08-03",
    "finish_date": "2026-08-14",
    "duration_days": 10,
    "effort_hrs": 6,
    "owner": "Allen + Kayla",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.4.3",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Pharmacy assessment build (per role)",
    "start_date": "2026-08-17",
    "finish_date": "2026-09-04",
    "duration_days": 15,
    "effort_hrs": 12,
    "owner": "Allen",
    "status": "Contingent",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.4.4",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "IDHS Pilot cert delivery (alongside ILT 9/14)",
    "start_date": "2026-09-14",
    "finish_date": "2026-09-18",
    "duration_days": 5,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Contingent",
    "notes": "Cert assessment runs alongside the prototype delivery.",
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.5",
    "outline_level": 2,
    "lane": "2 - Certification",
    "task_name": "Role-based EHR cert — FusionEHR (first EHR application)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen",
    "status": "Not Started",
    "notes": "Honest scope cut: FusionEHR cert by Q4. Remaining EHR apps (eMAR, OM, CPOE, Lab) roll into Q1-Q2 2027.",
    "goals": []
  },
  {
    "wbs_id": "2.5.1",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "FusionEHR role mapping (using proven pharmacy pattern)",
    "start_date": "2026-09-22",
    "finish_date": "2026-10-02",
    "duration_days": 9,
    "effort_hrs": 8,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.5.2",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "FusionEHR cert curriculum design",
    "start_date": "2026-10-05",
    "finish_date": "2026-10-30",
    "duration_days": 20,
    "effort_hrs": 24,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.5.3",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "FusionEHR cert assessment build",
    "start_date": "2026-11-02",
    "finish_date": "2026-11-20",
    "duration_days": 15,
    "effort_hrs": 16,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.5.4",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "FusionEHR cert launch (Q4 milestone — Obj 1 + Obj 3 hit)",
    "start_date": "2026-12-01",
    "finish_date": "2026-12-11",
    "duration_days": 9,
    "effort_hrs": 8,
    "owner": "Allen + Kayla",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 1",
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.6",
    "outline_level": 2,
    "lane": "2 - Certification",
    "task_name": "Internal Client Ops cert Phase 1 (co with Kayla T)",
    "start_date": null,
    "finish_date": null,
    "duration_days": null,
    "effort_hrs": null,
    "owner": "Allen + Kayla T + Adam",
    "status": "Not Started",
    "notes": "Target ≥90% Client Ops certified by Q4 end.",
    "goals": []
  },
  {
    "wbs_id": "2.6.1",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Client Ops curriculum design (uses pharmacy + FusionEHR outputs)",
    "start_date": "2026-09-21",
    "finish_date": "2026-10-30",
    "duration_days": 30,
    "effort_hrs": 16,
    "owner": "Allen + Kayla T",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.6.2",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Adam coordination — Client Ops roster + enrollment plan",
    "start_date": "2026-10-05",
    "finish_date": "2026-10-16",
    "duration_days": 10,
    "effort_hrs": 4,
    "owner": "Allen + Adam",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.6.3",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Phase 1 launch to Client Ops",
    "start_date": "2026-10-19",
    "finish_date": "2026-10-30",
    "duration_days": 10,
    "effort_hrs": 4,
    "owner": "Allen + Kayla T",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.6.4",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "Completion drive (Kayla T leads, Allen support)",
    "start_date": "2026-11-02",
    "finish_date": "2026-12-11",
    "duration_days": 30,
    "effort_hrs": 8,
    "owner": "Kayla T + Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  },
  {
    "wbs_id": "2.6.5",
    "outline_level": 3,
    "lane": "2 - Certification",
    "task_name": "≥90% Client Ops certified — verification (Q4 milestone)",
    "start_date": "2026-12-14",
    "finish_date": "2026-12-30",
    "duration_days": 13,
    "effort_hrs": 4,
    "owner": "Allen",
    "status": "Not Started",
    "notes": null,
    "goals": [
      "Obj 2"
    ]
  }
];

const MILESTONES: MilestoneRow[] = [
  {
    "type": "External - Client",
    "name": "RI DOC vILT (Maurice delivers, Allen prep support)",
    "date": "2026-06-29",
    "lane_goal": "Client work",
    "allen_role": "Support",
    "notes": "Maurice access: UAT (Rachel), LMS (via Steph/Allen as backup), agenda confirm (Kayla/Rachel)."
  },
  {
    "type": "Internal - Decision",
    "name": "Kayla framework decision deadline",
    "date": "2026-06-26",
    "lane_goal": "Lane 1 - Obj 1",
    "allen_role": "Awaiting",
    "notes": "Sent Sun 6/14. Allen check-in at 1:1."
  },
  {
    "type": "Internal - Decision",
    "name": "Q3 contractor-to-assignment map locked",
    "date": "2026-06-26",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": "Without this, 'cert before assignment' rolling deadline is invisible."
  },
  {
    "type": "Internal - Escalation",
    "name": "Dom L1+L2 review status (escalate if no movement)",
    "date": "2026-06-19",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Escalate",
    "notes": "L1 with Dom ~13 days as of 6/16. If silent by EOW, raise to Kayla."
  },
  {
    "type": "External - Client",
    "name": "DC DYRS vILT (5 apps x 3 hrs, Allen delivers)",
    "date": "2026-07-27",
    "lane_goal": "Client work",
    "allen_role": "Deliver",
    "notes": "Compliance Mgr, Non/Formulary Mgr, Group Notes, Care Plans. 7/27-31. Contractors assigned must be Cohort 1 cert'd."
  },
  {
    "type": "Internal - Deadline",
    "name": "Cohort 1 contractor cert complete (DC DYRS)",
    "date": "2026-07-24",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": null
  },
  {
    "type": "External - Client",
    "name": "IL DOC Super User vILT (Centurion lead, tentative)",
    "date": "2026-08-17",
    "lane_goal": "Client work",
    "allen_role": "Coord",
    "notes": "Aug 17-21. Cohort 2 contractor cert must be complete before. Allen role depends on Centurion takeover."
  },
  {
    "type": "Internal - Deadline",
    "name": "Cohort 2 contractor cert complete (IL DOC SU)",
    "date": "2026-08-14",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": null
  },
  {
    "type": "Internal - Deadline",
    "name": "Team product knowledge >=90% target",
    "date": "2026-08-31",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": "PATH 2 FIRST HARD DEADLINE. Gates: 2.1.1 (Dom) -> 2.1.2 -> 2.2.x sequence."
  },
  {
    "type": "Internal - Deadline",
    "name": "Cohort 3 contractor cert complete (IDHS)",
    "date": "2026-09-11",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": "Includes AB Staffing (Bricen, Jason)."
  },
  {
    "type": "External - Client",
    "name": "IDHS Pilot Wave 1 Training (pharmacy prototype proof point)",
    "date": "2026-09-14",
    "lane_goal": "Lane 1 - Obj 1 + Obj 2",
    "allen_role": "Deliver",
    "notes": "9/14-9/18 training; 9/21-9/25 go-live. Both prototype delivery AND pharmacy handoff proof for Kayla B's goal."
  },
  {
    "type": "External - Client",
    "name": "IL DOC Wave 2 EUT (Centurion lead)",
    "date": "2026-09-14",
    "lane_goal": "Client work",
    "allen_role": "Coord",
    "notes": "9/14-10/16, 5 weeks. Centurion delivers."
  },
  {
    "type": "Internal - Deadline",
    "name": "Q3 close — Contractor Cert Phase 1 documented",
    "date": "2026-09-30",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": null
  },
  {
    "type": "Internal - Deadline",
    "name": "Q3 close — Pharmacy handoff (Kayla B's goal)",
    "date": "2026-09-30",
    "lane_goal": "Lane 1 - Obj 2",
    "allen_role": "Deliver",
    "notes": "Proof point = IDHS 9/14 delivery."
  },
  {
    "type": "Internal - Deadline",
    "name": "Q3 close — Docebo reorg / role-based paths / interactive modules (Obj 3)",
    "date": "2026-09-30",
    "lane_goal": "Lane 1 - Obj 3",
    "allen_role": "Co-lead",
    "notes": "Honest scope cut: pharmacy prototype + Prescriber/Role 2 modules count toward 'interactive adult-learning modules.' Full reorg by 9/30 is Steph's lane."
  },
  {
    "type": "External - Client",
    "name": "IL DOC Go-Live (Big Bang)",
    "date": "2026-10-19",
    "lane_goal": "Client work",
    "allen_role": "Support",
    "notes": "High-load week."
  },
  {
    "type": "External - Client",
    "name": "CO DOC Pilot EUT (Steph)",
    "date": "2026-10-05",
    "lane_goal": "Client work (Steph)",
    "allen_role": "Awareness",
    "notes": "10/5-9. Steph delivers."
  },
  {
    "type": "External - Client",
    "name": "CO DOC Big Bang EUT (Steph)",
    "date": "2026-11-02",
    "lane_goal": "Client work (Steph)",
    "allen_role": "Awareness",
    "notes": "11/2-6. Steph delivers."
  },
  {
    "type": "US Holiday",
    "name": "Thanksgiving week (reduced capacity)",
    "date": "2026-11-26",
    "lane_goal": "All",
    "allen_role": "N/A",
    "notes": "Week of 11/23 ~12 hrs available."
  },
  {
    "type": "Internal - Deadline",
    "name": "FusionEHR cert launch",
    "date": "2026-12-11",
    "lane_goal": "Lane 2 - Obj 1 + Obj 2",
    "allen_role": "Lead",
    "notes": "First EHR-side cert built to proven pattern."
  },
  {
    "type": "Internal - Deadline",
    "name": "Pharmacy LMS suite launch (Steph's Obj 1 goal)",
    "date": "2026-12-18",
    "lane_goal": "Lane 1 - Obj 1",
    "allen_role": "Co-lead",
    "notes": "Full pharmacy suite live."
  },
  {
    "type": "Internal - Deadline",
    "name": "Client Ops Cert >=90% verified",
    "date": "2026-12-30",
    "lane_goal": "Lane 2 - Obj 2",
    "allen_role": "Lead",
    "notes": null
  },
  {
    "type": "US Holiday",
    "name": "Christmas / New Year (reduced capacity)",
    "date": "2026-12-24",
    "lane_goal": "All",
    "allen_role": "N/A",
    "notes": "Weeks of 12/21 and 12/28 reduced."
  },
  {
    "type": "Internal - Deadline",
    "name": "Q4 close — all in-scope goals",
    "date": "2026-12-31",
    "lane_goal": "All",
    "allen_role": "Lead",
    "notes": null
  }
];

const CAPACITY_WEEKS: CapacityRow[] = [
  {
    "week_start": "2026-06-15",
    "week_end": "2026-06-19",
    "available_hrs": 24,
    "lane1_planned": 1,
    "lane2_planned": 2,
    "notes": "Current week. Mostly waiting on Kayla framework + Dom L1. Steph LMS backup ad-hoc."
  },
  {
    "week_start": "2026-06-22",
    "week_end": "2026-06-26",
    "available_hrs": 24,
    "lane1_planned": 6,
    "lane2_planned": 4,
    "notes": "Steph back. IDHS scope confirm, contractor map, Docebo audit support."
  },
  {
    "week_start": "2026-06-29",
    "week_end": "2026-07-03",
    "available_hrs": 12,
    "lane1_planned": 6,
    "lane2_planned": 0,
    "notes": "RI DOC vILT week. Allen support only; Maurice delivers. Lock framework template, scope MVP."
  },
  {
    "week_start": "2026-07-06",
    "week_end": "2026-07-10",
    "available_hrs": 24,
    "lane1_planned": 14,
    "lane2_planned": 8,
    "notes": "Prescriber ILT redesign begins, Dom feedback incorporation, taxonomy design with Steph."
  },
  {
    "week_start": "2026-07-13",
    "week_end": "2026-07-17",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 14,
    "notes": "Heavy Prescriber build + Cohort 1 contractor cert delivery."
  },
  {
    "week_start": "2026-07-20",
    "week_end": "2026-07-24",
    "available_hrs": 24,
    "lane1_planned": 14,
    "lane2_planned": 8,
    "notes": "Role 2 ILT begins, Prescriber wraps, lock cert program structure."
  },
  {
    "week_start": "2026-07-27",
    "week_end": "2026-07-31",
    "available_hrs": 8,
    "lane1_planned": 8,
    "lane2_planned": 6,
    "notes": "DC DYRS vILT (15 hrs delivery, not in dept hrs). Cohort 2 cert begins."
  },
  {
    "week_start": "2026-08-03",
    "week_end": "2026-08-07",
    "available_hrs": 24,
    "lane1_planned": 14,
    "lane2_planned": 6,
    "notes": "Prescriber learner packet + eLearning storyboard, Role 2 ILT, pharmacy cert structure."
  },
  {
    "week_start": "2026-08-10",
    "week_end": "2026-08-14",
    "available_hrs": 24,
    "lane1_planned": 16,
    "lane2_planned": 6,
    "notes": "Heavy Role 2 + Prescriber JIT, Pattern doc decision rules. Team study window (self-study)."
  },
  {
    "week_start": "2026-08-17",
    "week_end": "2026-08-21",
    "available_hrs": 8,
    "lane1_planned": 8,
    "lane2_planned": 12,
    "notes": "IL DOC SU week (tentative attendance). Team assessment delivery, FusionEHR Steph build review."
  },
  {
    "week_start": "2026-08-24",
    "week_end": "2026-08-28",
    "available_hrs": 24,
    "lane1_planned": 14,
    "lane2_planned": 8,
    "notes": "SME reviews, Team remediation, pattern doc walkthrough."
  },
  {
    "week_start": "2026-08-31",
    "week_end": "2026-09-04",
    "available_hrs": 24,
    "lane1_planned": 16,
    "lane2_planned": 4,
    "notes": "Final revisions Roles 1+2, pattern doc complete. F deadline 8/31."
  },
  {
    "week_start": "2026-09-07",
    "week_end": "2026-09-11",
    "available_hrs": 24,
    "lane1_planned": 14,
    "lane2_planned": 8,
    "notes": "IDHS prep + run-through, Cohort 3 cert wraps."
  },
  {
    "week_start": "2026-09-14",
    "week_end": "2026-09-18",
    "available_hrs": 0,
    "lane1_planned": 30,
    "lane2_planned": 4,
    "notes": "IDHS Pilot DELIVERY (pharmacy prototype proof). Dept work paused."
  },
  {
    "week_start": "2026-09-21",
    "week_end": "2026-09-25",
    "available_hrs": 24,
    "lane1_planned": 10,
    "lane2_planned": 8,
    "notes": "Post-delivery retro + FusionEHR mapping + Client Ops curriculum begins. IL DOC EUT begins (Centurion)."
  },
  {
    "week_start": "2026-09-28",
    "week_end": "2026-10-02",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 8,
    "notes": "Pharmacy remaining roles build begins. Q3 close. FusionEHR mapping wraps."
  },
  {
    "week_start": "2026-10-05",
    "week_end": "2026-10-09",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 10,
    "notes": "FusionEHR cert curriculum design begins. CO DOC Pilot (Steph)."
  },
  {
    "week_start": "2026-10-12",
    "week_end": "2026-10-16",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 10,
    "notes": "FusionEHR cert continues. IL DOC EUT wraps 10/16."
  },
  {
    "week_start": "2026-10-19",
    "week_end": "2026-10-23",
    "available_hrs": 12,
    "lane1_planned": 8,
    "lane2_planned": 8,
    "notes": "IL DOC Big Bang week. Client Ops Phase 1 launch."
  },
  {
    "week_start": "2026-10-26",
    "week_end": "2026-10-30",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 10,
    "notes": "Recovery. Pharmacy roles continue, FusionEHR curriculum wraps."
  },
  {
    "week_start": "2026-11-02",
    "week_end": "2026-11-06",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 10,
    "notes": "FusionEHR assessment build. CO DOC Big Bang (Steph)."
  },
  {
    "week_start": "2026-11-09",
    "week_end": "2026-11-13",
    "available_hrs": 24,
    "lane1_planned": 12,
    "lane2_planned": 10,
    "notes": "Pharmacy roles build wraps. FusionEHR assessment continues."
  },
  {
    "week_start": "2026-11-16",
    "week_end": "2026-11-20",
    "available_hrs": 24,
    "lane1_planned": 8,
    "lane2_planned": 12,
    "notes": "SME pass on pharmacy roles, FusionEHR assessment wraps."
  },
  {
    "week_start": "2026-11-23",
    "week_end": "2026-11-27",
    "available_hrs": 12,
    "lane1_planned": 6,
    "lane2_planned": 4,
    "notes": "Thanksgiving week (Thu/Fri off). Light work."
  },
  {
    "week_start": "2026-11-30",
    "week_end": "2026-12-04",
    "available_hrs": 24,
    "lane1_planned": 10,
    "lane2_planned": 12,
    "notes": "Pharmacy QA + Steph publishing. FusionEHR cert launch prep."
  },
  {
    "week_start": "2026-12-07",
    "week_end": "2026-12-11",
    "available_hrs": 24,
    "lane1_planned": 10,
    "lane2_planned": 16,
    "notes": "FusionEHR cert LAUNCH. Pharmacy QA continues. Client Ops completion drive."
  },
  {
    "week_start": "2026-12-14",
    "week_end": "2026-12-18",
    "available_hrs": 24,
    "lane1_planned": 6,
    "lane2_planned": 10,
    "notes": "Pharmacy suite LAUNCH. Client Ops verification kicks off."
  },
  {
    "week_start": "2026-12-21",
    "week_end": "2026-12-25",
    "available_hrs": 12,
    "lane1_planned": 4,
    "lane2_planned": 4,
    "notes": "Christmas week. Most folks PTO."
  },
  {
    "week_start": "2026-12-28",
    "week_end": "2026-12-31",
    "available_hrs": 8,
    "lane1_planned": 0,
    "lane2_planned": 8,
    "notes": "Year-end. Client Ops >=90% final verification."
  }
];

export async function seedDatabase(): Promise<void> {
  try {
    const sql = getDb();

    await sql`CREATE TABLE IF NOT EXISTS project_metadata (
      id INT PRIMARY KEY DEFAULT 1,
      readme_content TEXT,
      seeded_at TIMESTAMPTZ
    )`;

    const seeded = await sql`SELECT seeded_at FROM project_metadata WHERE id = 1`;
    if (seeded.length > 0 && seeded[0].seeded_at) {
      return;
    }

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

    await sql`CREATE TABLE IF NOT EXISTS task_dependencies (
      wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
      predecessor_wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
      dep_type VARCHAR(2) NOT NULL DEFAULT 'FS',
      lag_days SMALLINT NOT NULL DEFAULT 0,
      PRIMARY KEY (wbs_id, predecessor_wbs_id)
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

    for (const t of TASKS) {
      const parent = deriveParent(t.wbs_id);
      await sql`
        INSERT INTO tasks (wbs_id, parent_wbs_id, outline_level, lane, task_name, start_date, finish_date, duration_days, effort_hrs, owner, status, notes)
        VALUES (${t.wbs_id}, ${parent}, ${t.outline_level}, ${t.lane}, ${t.task_name}, ${t.start_date}, ${t.finish_date}, ${t.duration_days}, ${t.effort_hrs}, ${t.owner}, ${t.status}, ${t.notes})
        ON CONFLICT (wbs_id) DO NOTHING
      `;
      for (const goal of t.goals) {
        await sql`
          INSERT INTO task_goals (wbs_id, goal) VALUES (${t.wbs_id}, ${goal})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    for (const m of MILESTONES) {
      await sql`
        INSERT INTO milestones (type, name, date, lane_goal, allen_role, notes)
        VALUES (${m.type}, ${m.name}, ${m.date}, ${m.lane_goal}, ${m.allen_role}, ${m.notes})
      `;
    }

    for (const c of CAPACITY_WEEKS) {
      await sql`
        INSERT INTO capacity_weeks (week_start, week_end, available_hrs, lane1_planned, lane2_planned, notes)
        VALUES (${c.week_start}, ${c.week_end}, ${c.available_hrs}, ${c.lane1_planned}, ${c.lane2_planned}, ${c.notes})
        ON CONFLICT (week_start) DO NOTHING
      `;
    }

    await sql`
      INSERT INTO project_metadata (id, seeded_at) VALUES (1, NOW())
      ON CONFLICT (id) DO UPDATE SET seeded_at = NOW()
    `;

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Seed error:', err);
  }
}
