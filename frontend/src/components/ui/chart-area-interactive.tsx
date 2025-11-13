"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "./use-mobile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";
import { z } from "zod"
import { DashboardGraphDataSchema } from "@/zod/dashboard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { Calendar } from "./calendar"
import { Button } from "./button"
import { DateRange } from "react-day-picker"

const chartConfig = {
  counts: {
    label: "Interview Counts",
  },
  scheduled: {
    label: "Scheduled",
    color: "hsl(var(--chart-1))",
  },
  concluded: {
    label: "Concluded",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

type ChartData = z.infer<typeof DashboardGraphDataSchema>["metrics"];
type ChartDataPoint = ChartData[number];

export function ChartAreaInteractive({
  data,
  onRangeChange,
  onChartClick
} : {
  data: ChartData,
  onRangeChange: (value: { startDate: Date; endDate: Date }) => void,
  onChartClick?: (data: ChartDataPoint) => void
}) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("7");
  const [showCustomRange, setShowCustomRange] = React.useState(false);
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7");
    }
  }, [isMobile]);
  console.log("graphhhhh", data)

  const transformedData = React.useMemo(() => {
    return data ?? [];
  }, [data]);

  const filteredData = React.useMemo(() => {
    return transformedData;
  }, [transformedData]);

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <CardTitle>Interview Statistics</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Scheduled vs Concluded Interviews
          </span>
          <span className="@[540px]/card:hidden">Interview Stats</span>
        </CardDescription>
        <div className="absolute right-4 top-4">
          <Select
            value={timeRange.toString()}
            onValueChange={(value) => {
              if (value === "custom") {
                setShowCustomRange(true)
                setTimeRange("custom")
              } else {
                const days = parseInt(value)
                const endDate = new Date()
                const startDate = new Date()
                startDate.setDate(endDate.getDate() - days)
                onRangeChange({ startDate, endDate })
                setTimeRange(days.toString())
              }
            }}
          >
            <SelectTrigger className="flex w-40 @[767px]/card:hidden">
              <SelectValue placeholder="Last 7 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart
            data={filteredData}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload[0]) {
                onChartClick?.(data.activePayload[0].payload);
              }
            }}
          >
            <defs>
              <linearGradient id="fillScheduled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-scheduled)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-scheduled)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillConcluded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-concluded)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-concluded)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />

            <ChartTooltip
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
              content={
                <ChartTooltipContent

                  indicator="dot"
                />
              }
            />

            <Area
              dataKey="scheduled"
              type="monotone"
              fill="url(#fillScheduled)"
              stroke="var(--color-scheduled)"
              stackId="a"
              cursor="pointer"
            />
            <Area
              dataKey="concluded"
              type="monotone"
              fill="url(#fillConcluded)"
              stroke="var(--color-concluded)"
              stackId="a"
              cursor="pointer"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <Dialog open={showCustomRange} onOpenChange={setShowCustomRange}>
        <DialogContent className="sm:max-w-[80%] sm:w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>

          <Calendar
            mode="range"
            selected={customRange}
            onSelect={setCustomRange}
            numberOfMonths={2}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCustomRange(false)}>
              Cancel
            </Button>

            <Button
              onClick={() => {
                if (customRange?.from && customRange?.to) {
                  onRangeChange({
                    startDate: customRange.from,
                    endDate: customRange.to
                  });
                  setShowCustomRange(false);
                }
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}