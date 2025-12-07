/**
 * Email Service
 * Handles Gmail and Outlook OAuth flows and email operations
 */

import * as db from "../db";

// OAuth configuration - from environment variables
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/email/gmail/callback";

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || "";
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || "";
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || "http://localhost:3000/api/email/outlook/callback";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface EmailMessage {
  id: string;
  threadId?: string;
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  date: Date;
  hasAttachments: boolean;
  attachments?: Array<{ name: string; mimeType: string; size: number }>;
}

// ============ Gmail Functions ============

export function getGmailAuthUrl(): string {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGmailCode(code: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GMAIL_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Gmail code: ${await response.text()}`);
  }

  return response.json();
}

export async function refreshGmailToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Gmail token: ${await response.text()}`);
  }

  return response.json();
}

export async function getGmailUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get Gmail user info");
  }

  const data = await response.json();
  return data.email;
}

// ============ Outlook Functions ============

export function getOutlookAuthUrl(): string {
  const scopes = [
    "openid",
    "email",
    "Mail.Read",
    "Mail.Send",
    "offline_access",
  ];

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    redirect_uri: OUTLOOK_REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    response_mode: "query",
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeOutlookCode(code: string): Promise<TokenResponse> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: OUTLOOK_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Outlook code: ${await response.text()}`);
  }

  return response.json();
}

export async function refreshOutlookToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Outlook token: ${await response.text()}`);
  }

  return response.json();
}

export async function getOutlookUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get Outlook user info");
  }

  const data = await response.json();
  return data.mail || data.userPrincipalName;
}

// ============ Common Functions ============

export async function getValidAccessToken(userId: number): Promise<{ token: string; provider: "gmail" | "outlook" } | null> {
  const integration = await db.getEmailIntegration(userId);
  if (!integration || !integration.accessToken) {
    return null;
  }

  const now = new Date();
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes

  if (integration.tokenExpiry && new Date(integration.tokenExpiry).getTime() - now.getTime() < expiryBuffer) {
    if (!integration.refreshToken) {
      return null;
    }

    try {
      let tokens: TokenResponse;
      if (integration.provider === "gmail") {
        tokens = await refreshGmailToken(integration.refreshToken);
      } else {
        tokens = await refreshOutlookToken(integration.refreshToken);
      }

      const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);
      await db.updateEmailIntegration(userId, {
        accessToken: tokens.access_token,
        tokenExpiry: newExpiry,
      });

      return { token: tokens.access_token, provider: integration.provider };
    } catch (error) {
      console.error("Failed to refresh email token:", error);
      await db.updateEmailIntegration(userId, { isConnected: false });
      return null;
    }
  }

  return { token: integration.accessToken, provider: integration.provider };
}

// ============ Gmail Email Operations ============

export async function fetchGmailMessages(accessToken: string, maxResults = 20): Promise<EmailMessage[]> {
  // Get list of message IDs
  const listResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listResponse.ok) {
    throw new Error("Failed to fetch Gmail messages");
  }

  const listData = await listResponse.json();
  const messages: EmailMessage[] = [];

  // Fetch each message's details
  for (const msg of listData.messages || []) {
    const msgResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!msgResponse.ok) continue;

    const msgData = await msgResponse.json();
    const headers = msgData.payload?.headers || [];

    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

    const fromHeader = getHeader("From") || "";
    const fromMatch = fromHeader.match(/(?:(.+?)\s*)?<(.+?)>/);

    messages.push({
      id: msgData.id,
      threadId: msgData.threadId,
      from: {
        name: fromMatch?.[1]?.trim() || undefined,
        address: fromMatch?.[2] || fromHeader,
      },
      to: parseEmailAddresses(getHeader("To") || ""),
      cc: parseEmailAddresses(getHeader("Cc") || ""),
      subject: getHeader("Subject") || "(No Subject)",
      bodyText: extractGmailBody(msgData.payload, "text/plain"),
      bodyHtml: extractGmailBody(msgData.payload, "text/html"),
      date: new Date(parseInt(msgData.internalDate)),
      hasAttachments: checkGmailAttachments(msgData.payload),
      attachments: extractGmailAttachments(msgData.payload),
    });
  }

  return messages;
}

function parseEmailAddresses(header: string): Array<{ name?: string; address: string }> {
  if (!header) return [];

  const addresses: Array<{ name?: string; address: string }> = [];
  const parts = header.split(",");

  for (const part of parts) {
    const match = part.trim().match(/(?:(.+?)\s*)?<(.+?)>/);
    if (match) {
      addresses.push({ name: match[1]?.trim(), address: match[2] });
    } else if (part.includes("@")) {
      addresses.push({ address: part.trim() });
    }
  }

  return addresses;
}

function extractGmailBody(payload: any, mimeType: string): string | undefined {
  if (!payload) return undefined;

  if (payload.mimeType === mimeType && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const body = extractGmailBody(part, mimeType);
      if (body) return body;
    }
  }

  return undefined;
}

function checkGmailAttachments(payload: any): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0) return true;
  if (payload.parts) {
    return payload.parts.some((part: any) => checkGmailAttachments(part));
  }
  return false;
}

function extractGmailAttachments(payload: any): Array<{ name: string; mimeType: string; size: number }> {
  const attachments: Array<{ name: string; mimeType: string; size: number }> = [];

  function extract(part: any) {
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        name: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body?.size || 0,
      });
    }
    if (part.parts) {
      part.parts.forEach(extract);
    }
  }

  if (payload) extract(payload);
  return attachments;
}

export async function sendGmailMessage(
  accessToken: string,
  to: string[],
  subject: string,
  bodyHtml: string,
  cc?: string[],
  bcc?: string[]
): Promise<{ id: string; threadId: string }> {
  const boundary = "boundary_" + Date.now();

  let message = [
    `To: ${to.join(", ")}`,
    cc && cc.length > 0 ? `Cc: ${cc.join(", ")}` : "",
    bcc && bcc.length > 0 ? `Bcc: ${bcc.join(", ")}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: text/html; charset=utf-8`,
    "",
    bodyHtml,
  ]
    .filter(Boolean)
    .join("\r\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send Gmail message: ${await response.text()}`);
  }

  return response.json();
}

// ============ Outlook Email Operations ============

export async function fetchOutlookMessages(accessToken: string, top = 20): Promise<EmailMessage[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$orderby=receivedDateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Outlook messages");
  }

  const data = await response.json();
  const messages: EmailMessage[] = [];

  for (const msg of data.value || []) {
    messages.push({
      id: msg.id,
      threadId: msg.conversationId,
      from: {
        name: msg.from?.emailAddress?.name,
        address: msg.from?.emailAddress?.address || "",
      },
      to: (msg.toRecipients || []).map((r: any) => ({
        name: r.emailAddress?.name,
        address: r.emailAddress?.address || "",
      })),
      cc: (msg.ccRecipients || []).map((r: any) => ({
        name: r.emailAddress?.name,
        address: r.emailAddress?.address || "",
      })),
      subject: msg.subject || "(No Subject)",
      bodyText: msg.body?.contentType === "text" ? msg.body?.content : undefined,
      bodyHtml: msg.body?.contentType === "html" ? msg.body?.content : undefined,
      date: new Date(msg.receivedDateTime),
      hasAttachments: msg.hasAttachments || false,
    });
  }

  return messages;
}

export async function sendOutlookMessage(
  accessToken: string,
  to: string[],
  subject: string,
  bodyHtml: string,
  cc?: string[],
  bcc?: string[]
): Promise<{ id: string }> {
  const message = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: bodyHtml,
      },
      toRecipients: to.map((email) => ({ emailAddress: { address: email } })),
      ccRecipients: cc?.map((email) => ({ emailAddress: { address: email } })) || [],
      bccRecipients: bcc?.map((email) => ({ emailAddress: { address: email } })) || [],
    },
    saveToSentItems: true,
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Failed to send Outlook message: ${await response.text()}`);
  }

  return { id: "sent" };
}

// ============ Sync Functions ============

export async function syncEmails(userId: number): Promise<{ synced: number; errors: number }> {
  const tokenData = await getValidAccessToken(userId);
  if (!tokenData) {
    throw new Error("Email not connected");
  }

  const integration = await db.getEmailIntegration(userId);
  if (!integration) {
    throw new Error("Email integration not found");
  }

  let messages: EmailMessage[];
  if (tokenData.provider === "gmail") {
    messages = await fetchGmailMessages(tokenData.token, 50);
  } else {
    messages = await fetchOutlookMessages(tokenData.token, 50);
  }

  let synced = 0;
  let errors = 0;

  // Get all clients for auto-linking
  const clients = integration.autoLinkToClients ? await db.getClientsByUserId(userId) : [];

  for (const msg of messages) {
    try {
      // Check if already synced
      const existing = await db.getEmailByExternalId(userId, msg.id);
      if (existing) continue;

      // Try to match client by email address
      let clientId: number | undefined;
      if (integration.autoLinkToClients) {
        const matchedClient = clients.find(
          (c) =>
            c.email?.toLowerCase() === msg.from.address.toLowerCase() ||
            msg.to.some((t) => t.address.toLowerCase() === c.email?.toLowerCase())
        );
        clientId = matchedClient?.id;
      }

      await db.createEmail({
        userId,
        clientId,
        externalId: msg.id,
        threadId: msg.threadId,
        direction: msg.from.address === integration.email ? "outbound" : "inbound",
        fromAddress: msg.from.address,
        fromName: msg.from.name,
        toAddresses: JSON.stringify(msg.to),
        ccAddresses: msg.cc ? JSON.stringify(msg.cc) : undefined,
        subject: msg.subject,
        bodyText: msg.bodyText,
        bodyHtml: msg.bodyHtml,
        hasAttachments: msg.hasAttachments,
        attachments: msg.attachments ? JSON.stringify(msg.attachments) : undefined,
        isRead: false,
        receivedAt: msg.date,
      });

      synced++;
    } catch (error) {
      console.error("Failed to sync email:", error);
      errors++;
    }
  }

  // Update last sync time
  await db.updateEmailIntegration(userId, { lastSyncAt: new Date() });

  return { synced, errors };
}

export async function disconnectEmail(userId: number): Promise<void> {
  await db.deleteEmailIntegration(userId);
}
