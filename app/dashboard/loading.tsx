export default function Loading() {
  return (
    <div>
      <div className="skeleton h-32 mb-5" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="skeleton h-72 lg:col-span-2" />
        <div className="space-y-6">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      </div>
    </div>
  );
}
