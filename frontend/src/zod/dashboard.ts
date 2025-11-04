import { z } from "zod";
export const DashboardSchema = z.object({
  interviews: z.object({
    created: z.object({
      today: z.number(),
    }),
  }),
  interviewSessions: z.object({
    concluded: z.object({
      today: z.number(),
      overall: z.number(),
    }),
    scheduled: z.number(),
    upcoming: z.number(),
    recent: z.array(z.unknown()),
  }),
});

export const DashboardGraphDataSchema = z.array(z.object({
  date: z.string(),
  scheduled: z.number(),
  concluded: z.number(),
}));