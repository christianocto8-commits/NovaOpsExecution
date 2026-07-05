"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

import { chartTheme } from "../hooks/use-chart-theme";
import { ChartData } from "../types";
import { ChartCard } from "./chart-card";

type PieChartCardProps = {
  title: string;
  description?: string;
  data: ChartData[];
  nameKey: string;
  valueKey: string;
};

const colors = [
  chartTheme.primary,
  chartTheme.info,
  chartTheme.warning,
  chartTheme.danger,
  chartTheme.secondary,
];

export function PieChartCard({ title, description, data, nameKey, valueKey }: PieChartCardProps) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
