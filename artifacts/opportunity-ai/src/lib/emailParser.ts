/**
 * Smart multi-email parser — 5 strategies in priority order:
 *   0. Numbered list  "1. Title\nSubject: ..."
 *   1. Explicit separators  ---  ===  ***
 *   2. Email header blocks  (Subject:/From: at start of line)
 *   3. Forwarded-message style
 *   4. Multi-blank-line paragraph split
 */

export interface DetectedEmail {
  index: number;
  subject: string;
  from: string;
  body: string;
  raw: string;
  preview: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function extractHeader(text: string, header: string): string {
  const m = text.match(new RegExp(`^${header}:\\s*(.+)$`, "im"));
  return m ? m[1].trim() : "";
}

function makeEmail(raw: string, index: number): DetectedEmail {
  // Pull subject — support both "Subject:" header and "Body:" label style
  const subject =
    extractHeader(raw, "Subject") ||
    extractHeader(raw, "Re") ||
    guessTitle(raw);

  // Sender — may not exist in every format
  const from =
    extractHeader(raw, "From") ||
    extractHeader(raw, "Sender") ||
    extractHeader(raw, "Contact") ||
    "";

  // Strip email-header-style lines and the "Body:" label for preview
  const bodyLines = raw
    .split("\n")
    .filter(
      (l) =>
        !(/^(Subject|From|To|Date|Cc|Bcc|Reply-To|Message-ID|MIME|Content|Body):\s*/i.test(l))
    )
    .join("\n")
    .trim();

  const preview = bodyLines.replace(/\s+/g, " ").slice(0, 140);
  return { index: index + 1, subject, from, body: bodyLines, raw, preview };
}

function guessTitle(text: string): string {
  // Skip numbered prefixes like "1. The Something" → return from Subject line or first real line
  const line = text
    .split("\n")
    .find((l) => l.trim().length > 5 && !/^[-=*\d]+/.test(l.trim().charAt(0)));
  return (line ?? text.split("\n")[0]).trim().slice(0, 80);
}

function valid(b: string) { return b.trim().length > 25; }

// ── Main export ───────────────────────────────────────────────────────────────

export function splitEmails(raw: string): DetectedEmail[] {
  // ── Strategy 0: Numbered list format
  //    Matches: blank line then "N. Some Title\n" where N is 1-99
  //    Works for: "1. The Graduate Trainee\nSubject: ..." pasted from portals / PDFs
  const numberedParts = raw.split(/\n\n+(?=\d{1,2}\.\s+\S)/);
  if (numberedParts.length > 1) {
    const emails = numberedParts.map((b) => b.trim()).filter(valid);
    if (emails.length > 1) return emails.map((b, i) => makeEmail(b, i));
  }

  // ── Strategy 1: Explicit separator lines (--- === *** 3+ chars on own line)
  const sep1 = raw.split(/\n[ \t]*[-=*]{3,}[ \t]*\n/);
  if (sep1.length > 1) {
    const emails = sep1.map((b) => b.trim()).filter(valid);
    if (emails.length > 1) return emails.map((b, i) => makeEmail(b, i));
  }

  // ── Strategy 2: Standard email header boundary detection
  //    Each new block starts with Subject:/From:/To: after a blank line
  const lines = raw.split("\n");
  const blocks: string[] = [];
  let cur: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmailHeader = /^(Subject|From|To|Date):\s+.+/i.test(line);
    const prevBlank = i === 0 || lines[i - 1].trim() === "";
    if (isEmailHeader && prevBlank && cur.join("").trim().length > 30) {
      const curText = cur.join("\n");
      if (/^(Subject|From):/im.test(curText)) {
        blocks.push(curText.trim());
        cur = [];
      }
    }
    cur.push(line);
  }
  if (cur.join("").trim().length > 20) blocks.push(cur.join("\n").trim());

  if (blocks.length > 1) {
    const emails = blocks.filter(valid);
    if (emails.length > 1) return emails.map((b, i) => makeEmail(b, i));
  }

  // ── Strategy 3: 4+ consecutive blank lines (paragraph boundaries)
  const sep3 = raw.split(/\n{4,}/);
  if (sep3.length > 1) {
    const emails = sep3.map((b) => b.trim()).filter(valid);
    if (emails.length > 1) return emails.map((b, i) => makeEmail(b, i));
  }

  // ── Fallback: treat entire text as a single email
  const single = raw.trim();
  return single.length > 10 ? [makeEmail(single, 0)] : [];
}
