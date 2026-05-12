import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { findAvailableTimeSlots } from '@/lib/rooms';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    const { history, message } = await request.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ functionDeclarations: [findAvailableSlotsTool] }]
    });

    const currentDate = new Date().toISOString().split('T')[0];

    const chat = model.startChat({
      history: history || [],
      systemInstruction: {
        role: "system",
        parts: [{ text: `You are a helpful room booking assistant for the Meeting Coordinator app. Today's date is ${currentDate}. You can translate relative phrases like "next tuesday" or "next week" into exact YYYY-MM-DD dates.
Use the 'find_available_slots' tool to check availability. You can pass an array of dates to check multiple days at once.
If the user mentions a specific room by name (e.g. "Cave", "Boardroom", "Meeting Room A"), extract the room name and pass it as the 'roomName' parameter so only that room's availability is shown.
When the tool returns availability data, write a SHORT, friendly 1-2 sentence summary (e.g. "Here are the available slots for next week — pick a time!"). Do NOT list the rooms or timeslots in your text response; they will be shown automatically in an interactive booking card.
If no slots are found on any date (or the specified room is fully booked), say so clearly.
When the user confirms a specific room and time, acknowledge it and output a markdown link to finalise the booking:
[Book {RoomName}](/schedule?room={roomId}&date={YYYY-MM-DD}&time={HH:MM}&endTime={HH:MM})` }]
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

      for (const call of functionCalls) {
        if (call.name === "find_available_slots") {
          const args = call.args as { dates: string[]; durationMinutes: number; startHour?: number; endHour?: number; roomName?: string };
          durationMinutes = args.durationMinutes;
          const allSlots: typeof rawAvailability = [];

          for (const date of args.dates) {
            const rooms = await findAvailableTimeSlots(
              date,
              args.startHour ?? 9,
              args.endHour ?? 18,
              args.durationMinutes,
              args.roomName,
            );
            if (rooms.length > 0) {
              allSlots.push({ date, rooms });
            }
          }

          rawAvailability = allSlots;

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                // Include roomId in the response so the AI can construct correct booking links
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

