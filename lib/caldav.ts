import ical from 'node-ical';

export interface CalDAVCredentials {
  username: string;
  password: string;
  host: string;
}

export interface CalDAVEvent {
  uid: string;
  title: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM:SS
  end_time: string;    // HH:MM:SS
  description: string;
}

function basicAuth(username: string, password: string) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

async function propfind(baseUrl: string, creds: CalDAVCredentials, path: string, body: string): Promise<string> {
  const url = `https://${creds.host}${path}`;
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      Authorization: basicAuth(creds.username, creds.password),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '0',
    },
    body,
  });
  if (!res.ok) throw new Error(`PROPFIND ${url} failed: ${res.status} ${res.statusText}`);
  return res.text();
}

function extractXmlValue(xml: string, tag: string): string | null {
  const re = new RegExp(`<[^:>]*:?${tag}[^>]*>([^<]+)<`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

async function discoverCalendarHome(creds: CalDAVCredentials): Promise<string> {
  // Step 1: find current-user-principal
  const principalXml = await propfind(
    `https://${creds.host}`,
    creds,
    '/',
    `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal /></d:prop>
</d:propfind>`
  );

  const principalHref = extractXmlValue(principalXml, 'href');
  const principalPath = principalHref ?? `/principals/users/${creds.username}/`;

  // Step 2: find calendar-home-set from principal
  const homeXml = await fetch(`https://${creds.host}${principalPath}`, {
    method: 'PROPFIND',
    headers: {
      Authorization: basicAuth(creds.username, creds.password),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '0',
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set /></d:prop>
</d:propfind>`,
  }).then(r => r.text()).catch(() => '');

  const homeHref = extractXmlValue(homeXml, 'href');
  return homeHref ?? `/${creds.username}/`;
}

export async function fetchCalDAVEvents(creds: CalDAVCredentials): Promise<CalDAVEvent[]> {
  const calendarHome = await discoverCalendarHome(creds);

  // Time range: 6 months back to 6 months ahead
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 6);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 6);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const reportBody = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmt(start)}" end="${fmt(end)}" />
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const reportUrl = `https://${creds.host}${calendarHome}`;
  const res = await fetch(reportUrl, {
    method: 'REPORT',
    headers: {
      Authorization: basicAuth(creds.username, creds.password),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
    },
    body: reportBody,
  });

  if (!res.ok) throw new Error(`REPORT ${reportUrl} failed: ${res.status} ${res.statusText}`);

  const xml = await res.text();

  // Extract all calendar-data blocks
  const icsBlocks: string[] = [];
  const calDataRe = /<[^:>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^:>]*:?calendar-data>/gi;
  let m: RegExpExecArray | null;
  while ((m = calDataRe.exec(xml)) !== null) {
    // Unescape XML entities
    const ics = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    if (ics) icsBlocks.push(ics);
  }

  const events: CalDAVEvent[] = [];

  for (const ics of icsBlocks) {
    const parsed = await ical.async.parseICS(ics);
    for (const comp of Object.values(parsed)) {
      if (comp.type !== 'VEVENT') continue;
      const vevent = comp as ical.VEvent;
      if (!vevent.start || !vevent.uid) continue;

      const startDate = new Date(vevent.start);
      const endDate = vevent.end ? new Date(vevent.end) : new Date(startDate.getTime() + 30 * 60 * 1000);

      const pad = (n: number) => String(n).padStart(2, '0');
      const toDate = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const toTime = (d: Date) =>
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      events.push({
        uid: String(vevent.uid),
        title: vevent.summary || '(No title)',
        date: toDate(startDate),
        start_time: toTime(startDate),
        end_time: toTime(endDate),
        description: vevent.description || '',
      });
    }
  }

  return events;
}
