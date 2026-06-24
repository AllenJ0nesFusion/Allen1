import PortfolioView from '@/components/PortfolioView';

export default function PortfolioPage() {
  return (
    <div>
      <h1 className="page-title text-2xl mb-1">Portfolio</h1>
      <p className="text-sm text-[#404D5B] mb-5">
        Every departmental goal at a glance — owner, health, rolled-up progress, and target date.
      </p>
      <PortfolioView />
    </div>
  );
}
