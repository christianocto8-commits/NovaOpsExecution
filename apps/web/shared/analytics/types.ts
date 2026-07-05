export type ChartData = Record<string, string | number>;

export type ChartSeries = {
  dataKey: string;
  name?: string;
  color?: string;
};
