import type { LucideIcon } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <Icon className={`h-5 w-5 ${iconClassName}`} />
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}