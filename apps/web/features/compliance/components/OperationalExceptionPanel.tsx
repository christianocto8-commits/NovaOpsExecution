import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { Task } from '@/features/tasks/types';

interface OperationalExceptionPanelProps {
  tasks: Task[];
}

export const OperationalExceptionPanel: React.FC<OperationalExceptionPanelProps> = ({ tasks }) => {
  const [now] = useState(() => Date.now());
  const overdueTasks = tasks.filter((task) => {
    const dueAt = task.due ? new Date(task.due).getTime() : Number.NaN;
    const completed = task.status.toLowerCase() === "completed";
    return !completed && Number.isFinite(dueAt) && dueAt < now;
  });
  const failedTasks = tasks.filter((task) => task.execution?.checklist?.status === "fail");
  const criticalTasks = failedTasks.filter(
    (task) => (task.execution?.checklist?.critical_failures?.length ?? 0) > 0
  );

  const exceptionTasks = Array.from(new Set([...overdueTasks, ...failedTasks]));

  if (exceptionTasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-red-900">
            {exceptionTasks.length} Masalah Operasional Terdeteksi
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {overdueTasks.length} overdue, {failedTasks.length} failed checklist
            {criticalTasks.length > 0 ? `, ${criticalTasks.length} critical` : ""}.
          </p>
          <Link href="/dashboard/tasks?filter=exceptions" className="inline-block mt-3 text-sm font-semibold text-red-700 hover:text-red-800 underline">
            Lihat daftar masalah
          </Link>
        </div>
      </div>
    </div>
  );
};
