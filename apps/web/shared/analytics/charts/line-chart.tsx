"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTheme } from "../hooks/use-chart-theme";
import { ChartData, ChartSeries } from "../types";
import { ChartCard } from "./chart-card";

type LineChartCardProps = {
  title: string;
  description?: string;
  data: ChartData[];
  xKey: string;
  series: ChartSeries[];
};

export function LineChartCard({ title, description, data, xKey, series }: LineChartCardProps) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            <Line
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              name={item.name}
              stroke={item.color ?? (index === 0 ? chartTheme.primary : chartTheme.info)}
              strokeWidth={3}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
