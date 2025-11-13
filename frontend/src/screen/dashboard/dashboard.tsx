import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive"
import { DataTable, RecentInterviewSchema } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { z } from "zod"

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const getInterviewsByDate = useMainStore().getInterviewsByDate;

  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    return { startDate, endDate };
  });

  const [selectedDateData, setSelectedDateData] = useState<{
    date: Date;
    type: 'hour' | 'date' | 'month';
    label: string;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);

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
      const data =  await getDashboardGraphdata(dateRange.startDate, dateRange.endDate);
      const formattedData = fillGraphData(data.labelFormat, data.metrics, dateRange)
      return { data: formattedData, labelFormat: data.labelFormat };
    },
    queryKey: ['dashboard-graph-data', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
  });
  console.log("Graph Data: ", graphData.data);

  const dateInterviews = useQuery({
    queryFn: async () => {
      if (!selectedDateData) return [];
      const data = await getInterviewsByDate(selectedDateData.date, selectedDateData.type);
      return data as TableData[];
    },
    queryKey: ['date-interviews', selectedDateData?.date.toISOString(), selectedDateData?.type],
    enabled: !!selectedDateData,
  });

  const handleChartClick = (data: { date: string; label: string; scheduled: number; concluded: number }) => {
    if (data && data.date && graphData.data?.labelFormat) {
      setSelectedDateData({
        date: new Date(data.date),
        type: graphData.data.labelFormat.type,
        label: data.label
      });
      setShowModal(true);
    }
  };

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
                <ChartAreaInteractive
                  data={graphData.data?.data || []}
                  onRangeChange={setDateRange}
                  onChartClick={handleChartClick}
                />
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

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[90%] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Interviews for {selectedDateData?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {dateInterviews.isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : dateInterviews.data && dateInterviews.data.length > 0 ? (
                <DataTable data={dateInterviews.data} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No interviews found for this date
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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

const fillGraphData = (
  labelFormat: {locales?: string, type: "hour" | "date" | "month", intlOptions: Intl.DateTimeFormatOptions },
  data: GraphMetricData = [],
  dateRange: { startDate: Date; endDate: Date }
): GraphMetricData => {
  const dateSet = new Set(data.map(item => item.label));
  const fullData: GraphMetricData = [...data];

  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);

  switch (labelFormat.type) {
    case "hour": {
      const diffHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      for (let i = 0; i <= diffHours; i++) {
        const date = new Date(start);
        date.setHours(start.getHours() + i);
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
      break;
    }
    case "date": {
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= diffDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
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
      break;
    }
    case "month": {
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      for (let i = 0; i <= diffMonths; i++) {
        const date = new Date(start);
        date.setMonth(start.getMonth() + i);
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
      break;
    }
  }

  fullData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return fullData;
};
