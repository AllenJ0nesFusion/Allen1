interface Milestone {
  id: number;
  type: string;
  name: string;
  date: string;
  lane_goal: string;
  allen_role: string;
  notes: string | null;
}

async function getMilestones(): Promise<Milestone[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/milestones`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json() as Promise<Milestone[]>;
}

const TYPE_COLOR: Record<string, string> = {
  'External - Client': '#C00000',
  'Internal - Deadline': '#0E4774',
  'Internal - Decision': '#7030A0',
  'Internal - Escalation': '#E8941A',
  'US Holiday': '#9aa5b1',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function monthLabel(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function MilestonesPage() {
  const milestones = await getMilestones();

  // Group by month
  const groups: { month: string; items: Milestone[] }[] = [];
  for (const m of milestones) {
    const label = monthLabel(m.date);
    const last = groups[groups.length - 1];
    if (last && last.month === label) last.items.push(m);
    else groups.push({ month: label, items: [m] });
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0E4774] mb-1">Milestones</h1>
      <p className="text-sm text-[#404D5B] mb-6">Key dates across the 2026 program timeline</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-[#404D5B]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>

      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.month}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#404D5B] mb-3">{g.month}</h2>
            <div className="relative border-l-2 border-[#E7E6E6] ml-2 space-y-4">
              {g.items.map((m) => (
                <div key={m.id} className="relative pl-6">
                  <span
                    className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: TYPE_COLOR[m.type] ?? '#9aa5b1' }}
                  />
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-[#2C3E50]">{m.name}</p>
                        <p className="text-xs text-[#404D5B] mt-0.5">
                          {fmtDate(m.date)} · {m.lane_goal} · Allen: {m.allen_role}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: (TYPE_COLOR[m.type] ?? '#9aa5b1') + '22', color: TYPE_COLOR[m.type] ?? '#404D5B' }}
                      >
                        {m.type}
                      </span>
                    </div>
                    {m.notes && <p className="text-xs text-[#404D5B] mt-2">{m.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
