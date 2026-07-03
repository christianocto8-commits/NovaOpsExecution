import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span className="text-slate-300">/</span>}

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-slate-500 hover:text-emerald-700"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-800">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}