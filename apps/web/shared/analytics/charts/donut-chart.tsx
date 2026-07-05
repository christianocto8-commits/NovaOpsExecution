"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

import { chartTheme } from "../hooks/use-chart-theme";
import { ChartData } from "../types";
import { ChartCard } from "./chart-card";

type DonutChartCardProps = {
  title: string;
  description?: string;
  data: ChartData[];
  nameKey: string;
  valueKey: string;
};

const colors = [
  chartTheme.primary,
  chartTheme.warning,
  chartTheme.danger,
  chartTheme.info,
  chartTheme.secondary,
];

export function DonutChartCard({
  title,
  description,
  data,
  nameKey,
  valueKey,
}: DonutChartCardProps) {
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
            innerRadius={55}
            outerRadius={90}
            paddingAngle={4}
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
