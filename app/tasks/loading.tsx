export default function Loading() {
  return (
    <div>
      <div className="skeleton h-7 w-40 mb-4" />
      <div className="flex gap-3 mb-5">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-9 w-40" />
      </div>
      <div className="skeleton h-96" />
    </div>
  );
}
