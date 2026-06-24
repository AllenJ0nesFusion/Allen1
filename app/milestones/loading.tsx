export default function Loading() {
  return (
    <div>
      <div className="skeleton h-7 w-40 mb-2" />
      <div className="skeleton h-4 w-72 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20" />)}
      </div>
    </div>
  );
}
