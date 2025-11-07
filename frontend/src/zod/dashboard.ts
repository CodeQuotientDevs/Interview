import { z } from "zod";
export const DashboardSchema = z.object({
  interviews: z.object({
    created: z.object({
      today: z.number(),
      overall: z.number()
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

export const DashboardGraphDataSchema = z.object({
  labelFormat: z.object({
    type: z.enum([ "hour", "date", "month" ]),
    intlOptions: z.record(z.any()),
  }),
  metrics: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      scheduled: z.number(),
      concluded: z.number(),
    })
  )
});