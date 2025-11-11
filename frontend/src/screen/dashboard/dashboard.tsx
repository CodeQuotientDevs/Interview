import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive"
import { DataTable, RecentInterviewSchema } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { z } from "zod"

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { useMainStore } from "@/store"
import { useState } from "react";
import { DashboardGraphDataSchema } from "@/zod/dashboard";

type TableData = z.infer<typeof RecentInterviewSchema>;
type GraphMetricData = z.infer<typeof DashboardGraphDataSchema>["metrics"];

export interface CardData {
    scheduledToday: number;
    completedToday: number;
    upcoming: number;
    totalInterviews: number;
    createdToday: number;
  }
export const Dashboard = () => {
  const dashboardStats = useMainStore().getDashboardStats;
  const getDashboardGraphdata = useMainStore().getDashboardGraphdata;
  const [timeRange, setTimeRange] = useState(7);

  const stats = useQuery({
    queryFn: async () => {
      const data =  await dashboardStats();
        return {
          cardData: {
            createdToday: data.interviews.created.today,
            completedToday: data.interviewSessions.concluded.today,
            scheduledToday: data.interviewSessions.scheduled,
            upcoming: data.interviewSessions.upcoming,
            totalInterviews: data.interviews.created.overall,
          },
          tableData: data.interviewSessions.recent as TableData[],
        }
    },
    queryKey: ['dashboard-stats'],
  });

  const graphData = useQuery({
    queryFn: async () => {
      const data =  await getDashboardGraphdata(timeRange);
      const formattedData = fillGraphData(data.labelFormat, data.metrics, timeRange)
      return formattedData;
    },
    queryKey: ['dashboard-graph-data', timeRange],
  });
  console.log("Graph Data: ", graphData.data);

  return (
    <>
        <SiteHeader title="Dashboard"/>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards sectionData={stats.data?.cardData || {
                  scheduledToday: 0,
                  completedToday: 0,
                  upcoming: 0,
                  totalInterviews: 0,
                  createdToday: 0,
                } } 
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={graphData.data || []} onRangeChange={setTimeRange} />
              </div>
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader className="relative">
                    <CardTitle>Recent Interviews</CardTitle>
                    <CardDescription>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable data={stats.data?.tableData || []} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
    </>
  )
}

const formatLabelDate = (labelFormat: {locales?: string, type: "hour" | "date" | "month", intlOptions: Intl.DateTimeFormatOptions }, date: Date): string => {
  try {
    switch (labelFormat.type) {
      case "hour":
      case "date":
      case "month":
        return date.toLocaleString(labelFormat.locales, labelFormat.intlOptions);
      default:
        return date.toLocaleString(labelFormat.locales);
    }
  } catch {
    return date.toLocaleDateString();
  }
};

const fillGraphData = (labelFormat: {locales?: string, type: "hour" | "date" | "month", intlOptions: Intl.DateTimeFormatOptions }, data: GraphMetricData = [], range = 7): GraphMetricData => {
  const today = new Date();

  const dateSet = new Set(data.map(item => item.label));
  const fullData: GraphMetricData = [...data];

  for (let i = 0; i <= range; i++) {
    const date = new Date(today);
    switch (labelFormat.type) {
      case "hour":
        date.setHours(today.getHours() - i);
        break;
      case "date":
        date.setDate(today.getDate() - i);
        break;
      case "month":
        date.setMonth(today.getMonth() - i);
        break;
    }
    console.log({labelFormat, date, formatLabelDate})
    const label = formatLabelDate(labelFormat, date);

    if (!dateSet.has(label)) {
      fullData.push({
        date: date.toISOString(),
        scheduled: 0,
        concluded: 0,
        label,
      });
    }
  }

  fullData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return fullData;
};
