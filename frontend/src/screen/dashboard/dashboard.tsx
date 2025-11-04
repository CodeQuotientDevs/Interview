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
type GraphData = z.infer<typeof DashboardGraphDataSchema>;

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
            totalInterviews: data.interviewSessions.concluded.overall,
          },
          tableData: data.interviewSessions.recent as TableData[],
        }
    },
    queryKey: ['dashboard-stats'],
  });

  const graphData = useQuery({
    queryFn: async () => {
      const data =  await getDashboardGraphdata(timeRange);
      const formattedData = generateEmptyGraphData(data, timeRange)
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

const generateEmptyGraphData = (data: GraphData = [], range = 7): GraphData => {
  const today = new Date();

  const normalizedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toISOString().slice(0, 10),
  }));

  const dateSet = new Set(normalizedData.map(item => item.date));
  const fullData: GraphData = [...normalizedData];

  for (let i = 0; i < range; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    if (!dateSet.has(dateStr)) {
      fullData.push({
        date: dateStr,
        scheduled: 0,
        concluded: 0,
      });
    }
  }

  fullData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return fullData;
};
