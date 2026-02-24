import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

const StatCard = ({ label, value, icon, trend, trendUp }: StatCardProps) => (
  <div className="glass-card p-5 animate-slide-up">
    <div className="flex items-start justify-between mb-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      {trend && (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trendUp
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {trend}
        </span>
      )}
    </div>
    <p className="stat-value">{value}</p>
    <p className="stat-label mt-1">{label}</p>
  </div>
);

export default StatCard;
