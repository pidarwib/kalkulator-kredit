import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      data-testid="page-header"
    >
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex items-center space-x-2 text-xs text-slate-500">
              {breadcrumbs.map((crumb, idx) => (
                <li key={idx} className="flex items-center">
                  {idx > 0 && <span className="mx-1.5 text-slate-400">/</span>}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="hover:text-slate-800 transition-colors"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="font-medium text-slate-700">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 sm:text-base">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
