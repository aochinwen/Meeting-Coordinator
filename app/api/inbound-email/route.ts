import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';

// Initialize Supabase Client (Service Role for backend operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Define the JSON schema we want Gemini to return
const meetingSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Title of the meeting" },
    date: { type: SchemaType.STRING, description: "Date of the meeting in YYYY-MM-DD format" },
    start_time: { type: SchemaType.STRING, description: "Start time of the meeting in HH:MM:SS format (24-hour)" },
    end_time: { type: SchemaType.STRING, description: "End time of the meeting in HH:MM:SS format (24-hour)" },
    description: { type: SchemaType.STRING, description: "Description or agenda of the meeting" },
    is_cancellation: { type: SchemaType.BOOLEAN, description: "True if the email indicates the meeting is cancelled" },
    proposed_tasks: {
      type: SchemaType.ARRAY,
      description: "A list of action items or preparation tasks implied by the meeting description",
      items: { type: SchemaType.STRING }
    },
    from_email: { type: SchemaType.STRING, description: "The email address of the organizer or sender" },
    to_emails: { 
      type: SchemaType.ARRAY, 
      description: "The list of email addresses for attendees/recipients",
      items: { type: SchemaType.STRING } 
    }
  },
  required: ["title", "date", "start_time", "end_time", "description", "is_cancellation", "proposed_tasks"]
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // For generic webhook compatibility, we check a few common fields
    const subject = payload.subject || payload.Subject || '';
    const textBody = payload.text || payload.TextBody || payload.body || payload.body_plain || '';
    const htmlBody = payload.html || payload.HtmlBody || '';
    const fromAddress = payload.from || payload.From || payload.from_email || '';
    const toAddress = payload.to || payload.To || payload.to_emails || '';
    
    // Extract ICS content if passed in the payload (often as an attachment string or base64)
    let icsContent = payload.ics || '';
    let calendarUid = null;

    if (icsContent) {
      const uidMatch = icsContent.match(/^UID:([^\r\n]+)/m);
      if (uidMatch && uidMatch[1]) {
        calendarUid = uidMatch[1].trim();
      }
    }

    // Call Gemini to extract structured info
    let parsedMeeting: Record<string, any> | null = null;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: meetingSchema,
        }
      });
      
      const prompt = `
        Please analyze this inbound meeting invite email and extract the details.
        
        Subject: ${subject}
        From: ${fromAddress}
        To: ${toAddress}
        
        Email Body:
        ${textBody || htmlBody}
        
        Calendar ICS Content (if any):
        ${icsContent}
      `;
      
      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      // Strip markdown formatting if present
      responseText = responseText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsedMeeting = JSON.parse(responseText);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      return NextResponse.json({ error: 'Failed to parse meeting details with AI', details: err?.message || String(err) }, { status: 500 });
    }

    // Determine Status (draft for new/updates, or cancelled)
    // We will save all inbound as 'draft' so user can review it first, 
    // but we note if it's a cancellation inside draft_data.
    if (!parsedMeeting) {
      return NextResponse.json({ error: 'Failed to parse meeting details: empty result' }, { status: 500 });
    }
    const isCancellation = parsedMeeting.is_cancellation || false;

    // Check if meeting with this UID already exists
    let existingMeetingId = null;
    let existingStatus = null;
    
    if (calendarUid) {
      const { data: existingMeeting } = await supabase
        .from('meetings')
        .select('id, status')
        .eq('calendar_uid', calendarUid)
        .single();
        
      if (existingMeeting) {
        existingMeetingId = existingMeeting.id;
        existingStatus = existingMeeting.status;
      }
    }

    const draftData = {
      raw_subject: subject,
      raw_body: textBody || htmlBody,
      from_email: parsedMeeting.from_email || fromAddress,
      to_emails: parsedMeeting.to_emails || (typeof toAddress === 'string' ? toAddress.split(',') : toAddress),
      is_cancellation: isCancellation,
      is_update: !!existingMeetingId
    };

    let meetingId = existingMeetingId;

    if (existingMeetingId) {
      // It's an update or cancellation for an existing meeting.
      // We will mark its draft_data to indicate there's pending review.
      // We don't overwrite title/time immediately - the user will review in Inbox.
      await supabase
        .from('meetings')
        .update({
          draft_data: {
            ...draftData,
            proposed_changes: {
              title: parsedMeeting.title,
              date: parsedMeeting.date,
              start_time: parsedMeeting.start_time,
              end_time: parsedMeeting.end_time,
              description: parsedMeeting.description
            }
          }
        })
        .eq('id', existingMeetingId);
    } else {
      // Insert as a new draft
      const { data: newMeeting, error: insertError } = await supabase
        .from('meetings')
        .insert({
          title: parsedMeeting.title || 'Untitled Meeting',
          date: parsedMeeting.date,
          start_time: parsedMeeting.start_time,
          end_time: parsedMeeting.end_time,
          description: parsedMeeting.description,
          status: 'draft',
          calendar_uid: calendarUid,
          draft_data: draftData
        })
        .select()
        .single();

      if (insertError || !newMeeting) {
        console.error("Supabase Insert Error:", insertError);
        return NextResponse.json({ error: 'Database insert failed', details: insertError }, { status: 500 });
      }
      
      meetingId = newMeeting.id;
    }

    // Insert Proposed Tasks
    if (parsedMeeting.proposed_tasks && Array.isArray(parsedMeeting.proposed_tasks)) {
      const tasksToInsert = parsedMeeting.proposed_tasks.map((taskDesc: string) => ({
        meeting_id: meetingId,
        description: taskDesc,
        is_completed: false
      }));

      if (tasksToInsert.length > 0) {
        await supabase.from('meeting_checklist_tasks').insert(tasksToInsert);
      }
    }

    return NextResponse.json({ success: true, meetingId });
  } catch (err: unknown) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
