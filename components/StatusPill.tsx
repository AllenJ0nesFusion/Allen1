const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Not Started':       { bg: '#E7E6E6', color: '#404D5B' },
  'In Progress':       { bg: '#0070C0', color: '#ffffff' },
  'Complete':          { bg: '#16a34a', color: '#ffffff' },
  'Waiting':           { bg: '#d1d5db', color: '#404D5B' },
  'Blocked':           { bg: '#C00000', color: '#ffffff' },
  'Decision Required': { bg: '#7030A0', color: '#ffffff' },
  'Contingent':        { bg: '#E8941A', color: '#ffffff' },
};

export default function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: '#E7E6E6', color: '#404D5B' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {status}
    </span>
  );
}
