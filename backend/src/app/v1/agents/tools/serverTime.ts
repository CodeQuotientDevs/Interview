import zod from "zod"
import { tool } from "langchain"

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc)
dayjs.extend(timezone)

export const getServerTime = tool(
    ({ }: {  }) => dayjs().format(),
    {
        name: 'get_server_time',
        description: "Get the server time.",
        schema: zod.object({}),
    }
)
