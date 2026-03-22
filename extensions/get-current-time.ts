/**
 * Get Current Time Extension - Provides current time information
 *
 * This tool returns the current time with various formatting options.
 * Supports ISO 8601, Unix timestamp, date-only, and time-only formats.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface TimeDetails {
  formatted: string;
  date: string;
  time: string;
  timezone: string;
  timezone_name: string;
  day_of_week: string;
  unix: number;
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getTimeDetails(format: string): TimeDetails {
  const now = new Date();
  const timezoneOffset = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const offsetMinutes = Math.abs(timezoneOffset) % 60;
  const offsetSign = timezoneOffset >= 0 ? "+" : "-";
  const paddedMinutes = offsetMinutes < 10 ? `0${offsetMinutes}` : `${offsetMinutes}`;
  const timezone = `UTC${offsetSign}${offsetHours}${
    offsetMinutes > 0 ? `:${paddedMinutes}` : ""
  }`;

  const timeDetails: TimeDetails = {
    formatted: "",
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    timezone: timezone,
    timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone,
    day_of_week: dayNames[now.getDay()],
    unix: Math.floor(now.getTime() / 1000),
  };

  switch (format) {
    case "unix":
      timeDetails.formatted = timeDetails.unix.toString();
      break;
    case "date":
      timeDetails.formatted = timeDetails.date;
      break;
    case "time":
      timeDetails.formatted = timeDetails.time;
      break;
    case "iso8601":
    default:
      timeDetails.formatted = now.toISOString();
      break;
  }

  return timeDetails;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "get_current_time",
    label: "Get Current Time",
    description:
      "Returns the current date and time with various formatting options. Includes timezone information, day of week, and Unix timestamp.",
    parameters: Type.Object({
      format: Type.Optional(
        Type.String({
          description:
            "Output format: 'iso8601' (default), 'unix' (seconds since epoch), 'date' (YYYY-MM-DD only), or 'time' (HH:MM:SS only)",
          enum: ["iso8601", "unix", "date", "time"],
        })
      ),
    }),

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const format = params.format || "iso8601";

      try {
        const timeDetails = getTimeDetails(format);

        const summaryLines = [
          `**Current Time**`,
          ``,
          `**Formatted:** ${timeDetails.formatted}`,
          `**Date:** ${timeDetails.date}`,
          `**Time:** ${timeDetails.time}`,
          `**Timezone:** ${timeDetails.timezone} (${timeDetails.timezone_name})`,
          `**Day of Week:** ${timeDetails.day_of_week}`,
          `**Unix Timestamp:** ${timeDetails.unix}`,
        ];

        return {
          content: [{ type: "text", text: summaryLines.join("\n") }],
          details: timeDetails,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (ctx.hasUI) {
          ctx.ui.notify(`Failed to get current time: ${errorMessage}`, "error");
        }
        throw error;
      }
    },
  });
}
