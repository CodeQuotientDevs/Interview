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

type ChartData = z.infer<typeof DashboardGraphDataSchema>;

export function ChartAreaInteractive({ data, onRangeChange } : { data: ChartData, onRangeChange: (value: number) => void}) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState(7);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange(7);
    }
  }, [isMobile]);
  console.log("graphhhhh", data)

  const transformedData = React.useMemo(() => {
    if (!data?.length) return [];
    return data.map((item) => ({
      date: item.date,
      scheduled: item.scheduled,
      concluded: item.concluded,
    }));
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!transformedData.length) return [];
    const referenceDate = new Date(transformedData[transformedData.length - 1].date);

    const daysToSubtract = timeRange ?? 30;

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return transformedData.filter((item) => new Date(item.date) >= startDate);
  }, [transformedData, timeRange]);

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
          <Select value={timeRange.toString()} onValueChange={value =>{ 
            onRangeChange(Number.parseInt(value));
            setTimeRange(Number.parseInt(value));
            }}>
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Last 3 months" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90" className="rounded-lg">
                  Last 3 months
                </SelectItem>
                <SelectItem value="30" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="7" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
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
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />

            <Area
              dataKey="scheduled"
              type="natural"
              fill="url(#fillScheduled)"
              stroke="var(--color-scheduled)"
              stackId="a"
            />
            <Area
              dataKey="concluded"
              type="natural"
              fill="url(#fillConcluded)"
              stroke="var(--color-concluded)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
