import { cn } from "@/lib/utils";

type Status = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  PENDING: {
    label: "En attente",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmé",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  REJECTED: {
    label: "Refusé",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  CANCELLED: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  COMPLETED: {
    label: "Terminé",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  NO_SHOW: {
    label: "Absent",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
};

type Props = {
  status: string;
  className?: string;
};

export default function BookingStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
