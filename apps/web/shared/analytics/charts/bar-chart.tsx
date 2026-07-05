"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { chartTheme } from "../hooks/use-chart-theme";
import { ChartData, ChartSeries } from "../types";
import { ChartCard } from "./chart-card";

type BarChartCardProps = {
  title: string;
  description?: string;
  data: ChartData[];
  xKey: string;
  series: ChartSeries[];
};

export function BarChartCard({ title, description, data, xKey, series }: BarChartCardProps) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="4 4" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: chartTheme.text, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip />
          {series.map((item, index) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              name={item.name}
              fill={item.color ?? (index === 0 ? chartTheme.primary : chartTheme.info)}
              radius={[8, 8, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
