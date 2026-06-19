import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { findAvailableTimeSlots, getRooms } from '@/lib/rooms';
import { generateAllOccurrences, generateOccurrences, calculateEndTime, formatRecurrencePattern, RecurrenceConfig } from '@/lib/recurrence';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const checkRecurringAvailabilityTool: FunctionDeclaration = {
  name: "check_recurring_availability",
  description: "Check room availability for a recurring meeting series at a fixed time across all occurrence dates. Use this for any recurring/repeating meeting request.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      frequency: { type: SchemaType.STRING, description: "Recurrence frequency: 'daily', 'weekly', 'bi-weekly', 'monthly' (same weekday position), or 'monthly-by-date' (same calendar day)" },
      daysOfWeek: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Days of week codes required for weekly/bi-weekly: 'Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'"
      },
      startDate: { type: SchemaType.STRING, description: "Series start date in YYYY-MM-DD format" },
      endDate: { type: SchemaType.STRING, description: "End date in YYYY-MM-DD format (when endRule is 'date')" },
      endCount: { type: SchemaType.NUMBER, description: "Number of occurrences (when endRule is 'count')" },
      endRule: { type: SchemaType.STRING, description: "End rule: 'date', 'count', or 'never'" },
      time: { type: SchemaType.STRING, description: "Fixed meeting time in HH:MM 24-hour format (e.g. '10:00')" },
      durationMinutes: { type: SchemaType.NUMBER, description: "Duration of each meeting in minutes" },
      roomName: { type: SchemaType.STRING, description: "Room name to check availability for" },
    },
    required: ["frequency", "startDate", "time", "durationMinutes", "roomName", "endRule"]
  }
};

const findAvailableSlotsTool: FunctionDeclaration = {
  name: "find_available_slots",
  description: "Find available room slots for a list of dates and duration.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      dates: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Array of dates in YYYY-MM-DD format to check availability for."
      },
      durationMinutes: { type: SchemaType.NUMBER, description: "Duration of the meeting in minutes (e.g. 60 for 1 hour)" },
      startHour: { type: SchemaType.NUMBER, description: "Start bound hour (0-23), default 9" },
      endHour: { type: SchemaType.NUMBER, description: "End bound hour (0-23), default 18" },
      roomName: { type: SchemaType.STRING, description: "Optional room name filter. If the user mentions a specific room (e.g. 'Cave', 'Boardroom'), pass it here to restrict results to only that room. Case-insensitive partial match." },
    },
    required: ["dates", "durationMinutes"]
  }
};

export async function POST(request: Request) {
  try {
    const { history, message, clientDate, localDayOfWeek } = await request.json();
    console.log('[assistant] received clientDate:', clientDate, ', localDayOfWeek:', localDayOfWeek);

    // Prefer the client-supplied local date/day so relative phrases like
    // "next Tuesday" resolve correctly for the user's timezone.
    const currentDate = clientDate || new Date().toISOString().split('T')[0];

    // Derive the day of week from clientDate server-side if the browser
    // didn't send localDayOfWeek (e.g. old cached bundle).
    // Parse at noon UTC to avoid any date-flip from timezone offsets.
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayOfWeek = localDayOfWeek
      || DAYS[new Date(`${currentDate}T12:00:00Z`).getUTCDay()];

    // Generate a 14-day calendar lookahead to help the LLM resolve relative dates accurately.
    const lookaheadDays = 14;
    const calendarLines: string[] = [];
    const baseDate = new Date(`${currentDate}T12:00:00Z`);
    for (let i = 0; i < lookaheadDays; i++) {
      const d = new Date(baseDate);
      d.setUTCDate(baseDate.getUTCDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      const dow = DAYS[d.getUTCDay()];
      if (i === 0) calendarLines.push(`- Today: ${dow}, ${dayStr}`);
      else if (i === 1) calendarLines.push(`- Tomorrow: ${dow}, ${dayStr}`);
      else calendarLines.push(`- ${dow}, ${dayStr}`);
    }
    const calendarLookahead = `Upcoming dates for reference:\n${calendarLines.join('\n')}`;

    // Pre-fetch all rooms so the AI knows which ones are real.
    // This prevents asking for date/duration for a fictional room.
    let roomList: string[] = [];
    try {
      const rooms = await getRooms();
      roomList = rooms.map(r => r.name);
    } catch {
      // Non-fatal: AI will fall back to tool-based discovery
    }
    const roomListText = roomList.length > 0
      ? `The ONLY valid rooms in the system are: ${roomList.map(n => `"${n}"`).join(', ')}.`
      : '';

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ functionDeclarations: [findAvailableSlotsTool, checkRecurringAvailabilityTool] }]
    });

    const chat = model.startChat({
      history: history || [],
      systemInstruction: {
        role: "system",
        parts: [{ text: `You are a helpful room booking assistant for the Meeting Coordinator app.
Today's date is ${currentDate} and the current day of the week is ${dayOfWeek}.

${calendarLookahead}

Use this calendar to accurately resolve relative date phrases like "next tuesday", "tomorrow", or "next week" into exact YYYY-MM-DD dates.
${roomListText}

ROOM VALIDATION RULE:
- If the user DOES NOT mention a specific room name, DO NOT ask them for a room. Proceed to check for missing information and then call the 'find_available_slots' tool, leaving the 'roomName' parameter empty to search all rooms.
- If the user mentions a specific room name, IMMEDIATELY check whether it appears in the valid room list above.
  - If the room name does NOT match any room in the list (even approximately), treat it as non-existent. Do NOT ask for date/duration. Instead call the tool anyway (with default 60 min and today's date) so the fallback mechanism can show real alternatives.
  - If the room IS in the list, proceed to check for missing information.

MISSING INFORMATION BEHAVIOR:
Before calling the 'find_available_slots' tool, you must have BOTH:
- A date or date range (e.g. "next Thursday", "next week", "2026-05-20")
- A duration (e.g. "2 hours", "30 minutes")
If either the date or duration is missing, ask for it in a single short friendly question. Do not proceed to the tool until you have both. Do NOT ask for a room name if it is missing.

TOOL USAGE:
Use the 'find_available_slots' tool to check availability. You can pass an array of dates for a range.
The system interprets various room name formats: e.g. "room 1124" matches "11-2-4".

IMPORTANT FALLBACK BEHAVIOR:
If the tool returns "isFallback: true", the requested room was NOT found but other available rooms are returned.
You MUST:
1. Acknowledge the specific room is unavailable.
2. Tell the user to select one of the other rooms shown below.
3. Keep it short and friendly.

SUCCESSFUL SEARCH:
Write a SHORT 1-2 sentence summary (e.g. "Here are the available slots — pick a time!"). Do NOT list rooms or slots in text; they appear in an interactive card.
If no slots found, say so clearly.
When the user confirms a room and time, output a markdown booking link:
[Book {RoomName}](/schedule?room={roomId}&date={YYYY-MM-DD}&time={HH:MM}&endTime={HH:MM})

RECURRING MEETING BEHAVIOR:
If the user mentions recurring/repeating meetings (e.g. "every week", "weekly", "daily", "every Monday", "repeat", "series"), use 'check_recurring_availability' instead of 'find_available_slots'.

Before calling 'check_recurring_availability', collect ALL of:
- Frequency (daily/weekly/bi-weekly/monthly/monthly-by-date)
- Days of week (for weekly/bi-weekly) — e.g. "Monday and Wednesday"
- For monthly: ask "Same date each month (e.g. the 28th), or same weekday (e.g. the 4th Monday)?"
  Use frequency 'monthly-by-date' for same date, 'monthly' for same weekday position.
- Start date
- Fixed meeting time — ask "What time?" if not provided
- Duration
- Room name — ask "Which room?" if not provided
- End rule — ALWAYS ask: "How many occurrences, or until when? (e.g. '10 times', 'until December', or 'ongoing')"

Once you have all details, CONFIRM with a brief summary before calling the tool:
e.g. "Got it — every Monday & Wednesday at 10:00–11:00 in the Boardroom, starting 2026-06-23, for 8 occurrences. Shall I check availability?"
Wait for user confirmation, then call the tool.

After 'check_recurring_availability' returns:
- Write a SHORT 1-2 sentence summary. The interactive card shows conflicts and the booking button.
- Do NOT list individual dates in text.` }]
      }
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];
      let rawAvailability: Array<{
        date: string;
        rooms: Array<{ roomId: string; roomName: string; capacity: number; slots: Array<{ startTime: string; endTime: string }> }>;
      }> = [];
      let durationMinutes = 60;
      let isFallback = false;

      let recurringAvailabilityResult: {
        roomId: string | null;
        roomName: string | null;
        frequency: string;
        daysOfWeek: string[] | null;
        startDate: string;
        time: string;
        endTime: string;
        durationMinutes: number;
        endRule: string;
        endDate?: string;
        endCount?: number;
        totalOccurrences: number;
        availableCount: number;
        conflictDates: string[];
      } | null = null;

      for (const call of functionCalls) {
        if (call.name === "check_recurring_availability") {
          const args = call.args as {
            frequency: string;
            daysOfWeek?: string[];
            startDate: string;
            endDate?: string;
            endCount?: number;
            endRule: string;
            time: string;
            durationMinutes: number;
            roomName: string;
          };

          console.log('[assistant] recurring tool args:', JSON.stringify(args));

          const config: RecurrenceConfig = {
            frequency: args.frequency as RecurrenceConfig['frequency'],
            daysOfWeek: args.daysOfWeek || null,
            startDate: new Date(args.startDate + 'T12:00:00Z'),
            endDate: args.endDate ? new Date(args.endDate + 'T12:00:00Z') : null,
          };

          let occurrenceDates: Date[];
          if (args.endRule === 'count' && args.endCount) {
            const dayBefore = new Date(args.startDate + 'T12:00:00Z');
            dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
            occurrenceDates = generateOccurrences(config, args.endCount, dayBefore);
          } else if (args.endRule === 'date' && args.endDate) {
            occurrenceDates = generateAllOccurrences(config, new Date(args.endDate + 'T12:00:00Z'));
          } else {
            // never / fallback: default 8 occurrences
            const dayBefore = new Date(args.startDate + 'T12:00:00Z');
            dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
            occurrenceDates = generateOccurrences(config, 8, dayBefore);
          }

          const [th, tm] = args.time.split(':').map(Number);
          const requestedStartMins = th * 60 + tm;
          const requestedEndMins = requestedStartMins + args.durationMinutes;
          const startHour = th;
          const endHour = Math.ceil(requestedEndMins / 60);

          let resolvedRoomId: string | null = null;
          let resolvedRoomName: string | null = null;
          const occurrenceResults: { date: string; available: boolean }[] = [];

          for (const d of occurrenceDates) {
            const dateStr = d.toISOString().split('T')[0];
            const slots = await findAvailableTimeSlots(dateStr, startHour, endHour, args.durationMinutes, args.roomName);
            let available = false;
            for (const room of slots) {
              for (const slot of room.slots) {
                const [sh, sm] = slot.startTime.split(':').map(Number);
                const [eh, em] = slot.endTime.split(':').map(Number);
                const slotStart = sh * 60 + sm;
                const slotEnd = eh * 60 + em;
                if (slotStart <= requestedStartMins && slotEnd >= requestedEndMins) {
                  available = true;
                  if (!resolvedRoomId) {
                    resolvedRoomId = room.roomId;
                    resolvedRoomName = room.roomName;
                  }
                  break;
                }
              }
              if (available) break;
            }
            occurrenceResults.push({ date: dateStr, available });
          }

          const conflictDates = occurrenceResults.filter(r => !r.available).map(r => r.date);
          const availableCount = occurrenceResults.filter(r => r.available).length;

          recurringAvailabilityResult = {
            roomId: resolvedRoomId,
            roomName: resolvedRoomName ?? args.roomName,
            frequency: args.frequency,
            daysOfWeek: args.daysOfWeek || null,
            startDate: args.startDate,
            time: args.time,
            endTime: calculateEndTime(args.time, args.durationMinutes),
            durationMinutes: args.durationMinutes,
            endRule: args.endRule,
            endDate: args.endDate,
            endCount: args.endCount,
            totalOccurrences: occurrenceResults.length,
            availableCount,
            conflictDates,
          };

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                totalOccurrences: occurrenceResults.length,
                availableCount,
                conflictDates,
                conflictCount: conflictDates.length,
              }
            }
          });
        }

        if (call.name === "find_available_slots") {
          const args = call.args as { dates: string[]; durationMinutes: number; startHour?: number; endHour?: number; roomName?: string };
          durationMinutes = args.durationMinutes;
          // Debug: log exactly what date(s) the AI computed
          console.log('[assistant] AI tool args:', JSON.stringify({ dates: args.dates, roomName: args.roomName, durationMinutes: args.durationMinutes }));

          let allSlots: typeof rawAvailability = [];
          let foundWithFilter = false;

          // 1. Try with user's room filter
          for (const date of args.dates) {
            const rooms = await findAvailableTimeSlots(
              date,
              args.startHour ?? 9,
              args.endHour ?? 18,
              args.durationMinutes,
              args.roomName,
            );
            if (rooms.length > 0) {
              foundWithFilter = true;
              allSlots.push({ date, rooms });
            }
          }

          // 2. Fallback: If filter was used but no results, try without filter
          if (!foundWithFilter && args.roomName) {
            isFallback = true;
            allSlots = [];
            for (const date of args.dates) {
              const rooms = await findAvailableTimeSlots(
                date,
                args.startHour ?? 9,
                args.endHour ?? 18,
                args.durationMinutes,
                undefined,
              );
              if (rooms.length > 0) {
                allSlots.push({ date, rooms });
              }
            }
          }

          rawAvailability = allSlots;

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                isFallback,
                availability: allSlots.map(d => ({
                  date: d.date,
                  rooms: d.rooms.map(r => ({ roomId: r.roomId, roomName: r.roomName, capacity: r.capacity, slots: r.slots }))
                }))
              }
            }
          });
        }
      }

      const finalResult = await chat.sendMessage(functionResponses);
      return NextResponse.json({
        text: finalResult.response.text(),
        history: await chat.getHistory(),
        availability: rawAvailability.length > 0 ? rawAvailability : undefined,
        durationMinutes,
        isFallback,
        recurringAvailability: recurringAvailabilityResult ?? undefined,
      });
    } else {
      return NextResponse.json({
        text: response.text(),
        history: await chat.getHistory(),
      });
    }

  } catch (error: any) {
    console.error("Assistant API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
