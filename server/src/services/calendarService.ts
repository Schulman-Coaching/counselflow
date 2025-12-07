/**
 * Google Calendar Service
 * Handles OAuth flow and calendar operations
 */

import * as db from "../db";

// Google OAuth configuration - these would come from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

/**
 * Generate the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(): string {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ];

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(userId: number): Promise<string | null> {
  const integration = await db.getCalendarIntegration(userId);
  if (!integration || !integration.accessToken) {
    return null;
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes

  if (integration.tokenExpiry && new Date(integration.tokenExpiry).getTime() - now.getTime() < expiryBuffer) {
    if (!integration.refreshToken) {
      return null;
    }

    try {
      const tokens = await refreshAccessToken(integration.refreshToken);
      const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

      await db.updateCalendarIntegration(userId, {
        accessToken: tokens.access_token,
        tokenExpiry: newExpiry,
      });

      return tokens.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      await db.updateCalendarIntegration(userId, { isConnected: false });
      return null;
    }
  }

  return integration.accessToken;
}

/**
 * List user's calendars
 */
export async function listCalendars(userId: number): Promise<GoogleCalendar[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error("Not authenticated with Google Calendar");
  }

  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to list calendars");
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  userId: number,
  calendarId: string,
  event: GoogleCalendarEvent
): Promise<GoogleCalendarEvent> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error("Not authenticated with Google Calendar");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  return response.json();
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  userId: number,
  calendarId: string,
  eventId: string,
  event: GoogleCalendarEvent
): Promise<GoogleCalendarEvent> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error("Not authenticated with Google Calendar");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update event: ${error}`);
  }

  return response.json();
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  userId: number,
  calendarId: string,
  eventId: string
): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error("Not authenticated with Google Calendar");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete event: ${error}`);
  }
}

/**
 * Sync a deadline to Google Calendar
 */
export async function syncDeadlineToCalendar(
  userId: number,
  deadline: {
    id: number;
    title: string;
    description?: string | null;
    dueDate: Date;
    priority: string;
  }
): Promise<{ eventId: string }> {
  const integration = await db.getCalendarIntegration(userId);
  if (!integration || !integration.isConnected || !integration.calendarId) {
    throw new Error("Calendar not connected or no calendar selected");
  }

  if (!integration.syncDeadlines) {
    throw new Error("Deadline sync is disabled");
  }

  // Check if event already exists
  const existingEvent = await db.getCalendarEventByEntity(userId, "deadline", deadline.id);

  const eventData: GoogleCalendarEvent = {
    summary: `[Deadline] ${deadline.title}`,
    description: deadline.description || undefined,
    start: {
      date: deadline.dueDate.toISOString().split("T")[0],
    },
    end: {
      date: deadline.dueDate.toISOString().split("T")[0],
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 * 24 }, // 1 day before
        { method: "popup", minutes: 60 }, // 1 hour before
      ],
    },
  };

  let googleEvent: GoogleCalendarEvent;

  if (existingEvent) {
    // Update existing event
    googleEvent = await updateCalendarEvent(
      userId,
      integration.calendarId,
      existingEvent.externalEventId,
      eventData
    );

    await db.updateCalendarEvent(existingEvent.id, {
      title: deadline.title,
      startTime: deadline.dueDate,
      lastSyncAt: new Date(),
    });
  } else {
    // Create new event
    googleEvent = await createCalendarEvent(userId, integration.calendarId, eventData);

    await db.createCalendarEvent({
      userId,
      provider: "google",
      externalEventId: googleEvent.id!,
      entityType: "deadline",
      entityId: deadline.id,
      title: deadline.title,
      startTime: deadline.dueDate,
    });
  }

  return { eventId: googleEvent.id! };
}

/**
 * Sync a task to Google Calendar
 */
export async function syncTaskToCalendar(
  userId: number,
  task: {
    id: number;
    title: string;
    description?: string | null;
    dueDate: Date;
    priority: string;
    estimatedMinutes?: number | null;
  }
): Promise<{ eventId: string }> {
  const integration = await db.getCalendarIntegration(userId);
  if (!integration || !integration.isConnected || !integration.calendarId) {
    throw new Error("Calendar not connected or no calendar selected");
  }

  if (!integration.syncTasks) {
    throw new Error("Task sync is disabled");
  }

  // Check if event already exists
  const existingEvent = await db.getCalendarEventByEntity(userId, "task", task.id);

  const startTime = new Date(task.dueDate);
  startTime.setHours(9, 0, 0, 0); // Default to 9 AM

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + (task.estimatedMinutes || 60));

  const eventData: GoogleCalendarEvent = {
    summary: `[Task] ${task.title}`,
    description: task.description || undefined,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
      ],
    },
  };

  let googleEvent: GoogleCalendarEvent;

  if (existingEvent) {
    // Update existing event
    googleEvent = await updateCalendarEvent(
      userId,
      integration.calendarId,
      existingEvent.externalEventId,
      eventData
    );

    await db.updateCalendarEvent(existingEvent.id, {
      title: task.title,
      startTime: startTime,
      endTime: endTime,
      lastSyncAt: new Date(),
    });
  } else {
    // Create new event
    googleEvent = await createCalendarEvent(userId, integration.calendarId, eventData);

    await db.createCalendarEvent({
      userId,
      provider: "google",
      externalEventId: googleEvent.id!,
      entityType: "task",
      entityId: task.id,
      title: task.title,
      startTime: startTime,
      endTime: endTime,
    });
  }

  return { eventId: googleEvent.id! };
}

/**
 * Remove a synced event from calendar
 */
export async function removeSyncedEvent(
  userId: number,
  entityType: "deadline" | "task",
  entityId: number
): Promise<void> {
  const integration = await db.getCalendarIntegration(userId);
  if (!integration || !integration.isConnected || !integration.calendarId) {
    return;
  }

  const existingEvent = await db.getCalendarEventByEntity(userId, entityType, entityId);
  if (!existingEvent) {
    return;
  }

  try {
    await deleteCalendarEvent(userId, integration.calendarId, existingEvent.externalEventId);
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
  }

  await db.deleteCalendarEvent(existingEvent.id);
}

/**
 * Disconnect calendar integration
 */
export async function disconnectCalendar(userId: number): Promise<void> {
  // Delete all synced events from the database (they'll remain in Google Calendar)
  const events = await db.getCalendarEventsByUser(userId);
  for (const event of events) {
    await db.deleteCalendarEvent(event.id);
  }

  // Delete the integration
  await db.deleteCalendarIntegration(userId);
}
