<script lang="ts">
  import { splitEmails } from "../lib/emailParser";
  import type { DetectedEmail } from "../lib/emailParser";
  import type { ScoredOpportunity } from "../lib/types";

  interface Props { onResults: (count: number) => void; profileId?: string; }
  let { onResults, profileId: propProfileId }: Props = $props();

  let emailText   = $state("");
  let phase       = $state<"idle" | "preview" | "streaming" | "done">("idle");
  let error       = $state("");
  let logs        = $state<{ type: string; text: string; icon: string }[]>([]);
  let streamedOpps= $state<ScoredOpportunity[]>([]);
  let totalEmails = $state(0);
  let processedCount = $state(0);
  let detectedEmails = $state<DetectedEmail[]>([]);
  let skippedEmails  = $state<{index:number; preview:string; reason:string}[]>([]);

  let emailCount = $derived(
    emailText.trim().length > 0
      ? splitEmails(emailText).length
      : 0
  );

  const SAMPLE = `Subject: Summer AI Research Internship — Google DeepMind
From: recruiting@deepmind.google.com

We are excited to announce our Summer 2026 Research Internship program. We're looking for passionate BS/MS/PhD students in Computer Science or related fields.

Requirements: Python, TensorFlow or PyTorch, Machine Learning fundamentals
CGPA: Minimum 3.5
Location: Remote / London
Deadline: May 15, 2026
Stipend: $8,000/month
Apply: https://careers.google.com/deepmind-intern-2026

---

Subject: HackPak 2026 — Win PKR 500,000 in Cash Prizes
From: team@hackpak.io

HackPak is back! Pakistan's largest student hackathon returns with 48 hours of non-stop innovation.

Open to ALL university students — no CGPA requirement!
Tracks: AI/ML, FinTech, HealthTech, ClimaTech
Deadline: April 25, 2026 (Registration)
Prize Pool: PKR 500,000 + internship offers
Register: https://hackpak.io/register-2026

---

Subject: HEC Merit Scholarship for STEM Students
From: scholarships@hec.gov.pk

The Higher Education Commission offers need-based merit scholarships for undergraduates.

Eligibility: Semester 4-8, CGPA >= 3.0, Financial need demonstrated
Degree: BS in any STEM field
Amount: Full tuition + PKR 15,000/month stipend
Documents: Transcript, Income certificate, 2 reference letters
Deadline: April 30, 2026
Apply: https://hec.gov.pk/scholarships/stem-2026`;

  function loadSample() { emailText = SAMPLE; }

  function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { emailText = ev.target?.result as string; };
    reader.readAsText(file);
  }

  function previewEmails() {
    if (!emailText.trim()) { error = "Paste at least one email first."; return; }
    error = "";
    const parsed = splitEmails(emailText);
    if (parsed.length === 0) { error = "Could not detect any emails. Try separating them with --- on its own line."; return; }
    detectedEmails = parsed;
    phase = "preview";
  }

  function addLog(type: string, text: string, icon: string) {
    logs = [...logs, { type, text, icon }];
    setTimeout(() => {
      const el = document.getElementById("stream-log");
      if (el) el.scrollTop = el.scrollHeight;
    }, 10);
  }

  function getTypeColor(type: string) {
    const m: Record<string,string> = {
      internship:"#2196F3", hackathon:"#FF9800", scholarship:"#4CAF50",
      competition:"#FF5722", job:"#9C27B0", fellowship:"#009688",
    };
    return m[type?.toLowerCase()] ?? "#6B7280";
  }

  function getScoreColor(s: number) {
    if (s >= 75) return "#4CAF50";
    if (s >= 50) return "#2196F3";
    if (s >= 30) return "#FF9800";
    return "#EF5350";
  }

  async function startAnalysis() {
    phase = "streaming";
    logs = [];
    streamedOpps = [];
    skippedEmails = [];
    processedCount = 0;

    const profileId = propProfileId || localStorage.getItem("session_profileId") || undefined;

    const rawEmails = detectedEmails.map(d => d.raw);

    let res: Response;
    try {
      res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: rawEmails, profileId }),
      });
    } catch {
      error = "Could not reach the server.";
      phase = "preview";
      return;
    }

    if (!res.body) { error = "Streaming not supported."; phase = "preview"; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function handleEvent(event: string, data: any) {
      if (event === "start") {
        totalEmails = data.total;
        addLog("info", `Processing ${data.total} email${data.total>1?"s":""}${data.profileLoaded?" with your profile":" (set your profile for personalised scores)"}`, "◆");
      } else if (event === "analyzing") {
        processedCount = data.index;
        const preview = data.preview?.slice(0, 70) ?? "";
        addLog("analyzing", `[${data.index}/${data.total}] Scanning → ${preview}…`, "⟳");
      } else if (event === "opportunity") {
        const opp = data.opportunity as ScoredOpportunity;
        streamedOpps = [...streamedOpps, opp]
          .sort((a,b) => b.score - a.score)
          .map((o, i) => ({...o, rank: i+1}));
        addLog("found", `✓ ${opp.title}  [${opp.type}]  score: ${opp.score}/100`, "✓");
      } else if (event === "skipped") {
        const emailAtIndex = detectedEmails[data.index - 1];
        const preview = emailAtIndex?.subject || emailAtIndex?.preview?.slice(0,60) || `Email ${data.index}`;
        const reason = data.reason || "No actionable opportunity found";
        skippedEmails = [...skippedEmails, { index: data.index, preview, reason }];
        addLog("skipped", `[${data.index}/${data.total}] Filtered out: "${preview}"`, "✕");
      } else if (event === "done") {
        addLog("done", `✔ Done — ${data.totalOpportunities} opportunit${data.totalOpportunities===1?"y":"ies"} from ${data.totalProcessed} emails`, "◈");
        phase = "done";
        onResults(data.totalOpportunities);
      } else if (event === "error") {
        error = data.message ?? "Unknown error";
        phase = "preview";
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const eM = chunk.match(/^event: (.+)$/m);
          const dM = chunk.match(/^data: (.+)$/ms);
          if (!eM || !dM) continue;
          try { handleEvent(eM[1].trim(), JSON.parse(dM[1].trim())); } catch {}
        }
      }
    } catch {
      error = "Stream interrupted.";
      phase = "preview";
    }
  }

  function reset() { phase = "idle"; logs = []; streamedOpps = []; error = ""; detectedEmails = []; }
</script>

<div class="animate-fade-in">

  <!-- IDLE PHASE -->
  {#if phase === "idle"}
    <div style="margin-bottom:32px;">
      <h1 class="page-title">Analyze Emails</h1>
      <p class="page-subtitle">Paste raw email text — AI reads every email and ranks opportunities by your profile fit.</p>
    </div>

    <div class="card" style="padding:24px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <span class="section-label">Email Content</span>
        <div style="display:flex;gap:8px;">
          <button onclick={loadSample} class="btn-subtle">Load sample</button>
          <label class="btn-subtle" style="cursor:pointer;">
            Upload .txt
            <input type="file" accept=".txt,.eml,.json" onchange={handleFile} style="display:none;" data-testid="file-upload" />
          </label>
        </div>
      </div>

      <textarea
        bind:value={emailText}
        placeholder="Paste one or many emails. Separate with --- on its own line."
        data-testid="email-input"
        class="textarea-input"
      ></textarea>

      {#if emailText.trim()}
        <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
          <span class="email-count-badge">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="#2196F3"><circle cx="4" cy="4" r="3"/></svg>
            {emailCount} email{emailCount!==1?"s":""} detected
          </span>
          <span style="font-size:12px;color:#9CA3AF;">{emailText.length.toLocaleString()} chars</span>
        </div>
      {/if}
    </div>

    {#if error}
      <div class="error-box" data-testid="error-message">{error}</div>
    {/if}

    <button onclick={previewEmails} data-testid="analyze-button" class="btn-primary" style="width:100%;">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1a6.5 6.5 0 100 13A6.5 6.5 0 007.5 1zm-.5 9L4 7l1-1 2 2 3-3 1 1z" fill="white"/></svg>
      Detect &amp; Preview Emails →
    </button>

    <div style="margin-top:32px;border-top:1px solid #E8E8E8;padding-top:24px;">
      <p class="section-label" style="margin:0 0 16px 0;">How it works</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        {#each [
          {step:"01",title:"Auto-Parse",desc:"Detects individual emails from any paste or .txt file automatically"},
          {step:"02",title:"AI Extracts",desc:"Nemotron scans each email — title, deadline, requirements, links"},
          {step:"03",title:"Score & Rank",desc:"100-point scoring ranks by your profile fit with explanations"},
        ] as item}
          <div class="card" style="padding:16px;">
            <div style="font-family:var(--font-mono);font-size:11px;color:#2196F3;font-weight:600;margin-bottom:6px;">{item.step}</div>
            <div style="font-size:13px;font-weight:600;color:#1A1A2E;margin-bottom:4px;">{item.title}</div>
            <div style="font-size:12px;color:#9CA3AF;line-height:1.5;">{item.desc}</div>
          </div>
        {/each}
      </div>
    </div>

  <!-- PREVIEW PHASE -->
  {:else if phase === "preview"}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <h1 class="page-title">{detectedEmails.length} Email{detectedEmails.length!==1?"s":""} Detected</h1>
        <p class="page-subtitle">Review what was found, then start analysis.</p>
      </div>
      <button onclick={reset} class="btn-outline">← Back</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
      {#each detectedEmails as email}
        <div class="card" style="padding:14px 18px;display:flex;gap:14px;align-items:flex-start;">
          <div class="email-index-badge">{email.index}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:#1A1A2E;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              {email.subject || "No subject"}
            </div>
            {#if email.from}
              <div style="font-size:11px;color:#9CA3AF;font-family:var(--font-mono);margin-bottom:5px;">{email.from}</div>
            {/if}
            <div style="font-size:12px;color:#9CA3AF;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
              {email.preview}
            </div>
          </div>
          <div style="flex-shrink:0;font-size:11px;color:#9CA3AF;font-family:var(--font-mono);margin-top:2px;">
            {email.raw.length.toLocaleString()}c
          </div>
        </div>
      {/each}
    </div>

    {#if error}
      <div class="error-box">{error}</div>
    {/if}

    <button onclick={startAnalysis} class="btn-primary" style="width:100%;">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>
      Analyze All {detectedEmails.length} Email{detectedEmails.length!==1?"s":""}
    </button>

  <!-- STREAMING / DONE -->
  {:else}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h1 class="page-title">{phase==="done" ? "Analysis Complete" : "Analyzing…"}</h1>
        <p class="page-subtitle">
          {#if phase!=="done"}
            Email {processedCount} of {totalEmails}
          {:else}
            {streamedOpps.length} opportunit{streamedOpps.length===1?"y":"ies"} found and ranked
          {/if}
        </p>
      </div>
      {#if phase==="done"}
        <button onclick={reset} class="btn-outline">+ New analysis</button>
      {/if}
    </div>

    <!-- Progress bar -->
    {#if phase!=="done" && totalEmails>0}
      <div style="height:4px;background:#E8E8E8;border-radius:4px;margin-bottom:20px;overflow:hidden;">
        <div style="height:100%;background:linear-gradient(90deg,#1976D2,#2196F3);border-radius:4px;transition:width 0.5s ease;width:{Math.round((processedCount/totalEmails)*100)}%;"></div>
      </div>
    {/if}

    <!-- Email step indicators -->
    {#if totalEmails>0}
      <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;">
        {#each Array(totalEmails) as _, i}
          {@const done = i < processedCount}
          {@const active = i === processedCount - 1 && phase !== "done"}
          <div class="step-dot" class:done class:active>{i+1}</div>
        {/each}
      </div>
    {/if}

    <!-- Live log -->
    <div id="stream-log" class="card log-box">
      {#each logs as log}
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span class="log-icon" class:found={log.type==='found'} class:analyzing={log.type==='analyzing'} class:log-done={log.type==='done'} class:skipped={log.type==='skipped'}>{log.icon}</span>
          <span class="log-text" class:found={log.type==='found'} class:skipped={log.type==='skipped'}>{log.text}</span>
        </div>
      {/each}
      {#if phase==="streaming"}
        <div style="display:flex;gap:6px;align-items:center;color:#2196F3;opacity:0.6;">
          <span class="pulse-dot" style="width:6px;height:6px;background:#2196F3;border-radius:50%;flex-shrink:0;"></span>
          <span>model thinking…</span>
        </div>
      {/if}
    </div>

    <!-- Live results -->
    {#if streamedOpps.length > 0}
      <p class="section-label" style="margin:0 0 12px 0;">Live Ranking ({streamedOpps.length})</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        {#each streamedOpps as opp}
          {@const sc = getScoreColor(opp.score)}
          {@const tc = getTypeColor(opp.type)}
          {@const circ = 2 * Math.PI * 20}
          <div class="card result-card">
            <div style="flex-shrink:0;position:relative;width:52px;height:52px;">
              <svg width="52" height="52" viewBox="0 0 52 52" style="transform:rotate(-90deg);">
                <circle cx="26" cy="26" r="20" stroke="#E8E8E8" stroke-width="3" fill="none"/>
                <circle cx="26" cy="26" r="20" stroke={sc} stroke-width="3" fill="none"
                  stroke-linecap="round"
                  stroke-dasharray={circ}
                  stroke-dashoffset={circ - (opp.score/100)*circ}
                  style="transition:stroke-dashoffset 0.6s ease;"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <span style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:{sc};line-height:1;">{opp.score}</span>
                <span style="font-size:8px;color:#9CA3AF;">#{opp.rank}</span>
              </div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;align-items:center;">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:{tc};background:{tc}12;padding:3px 8px;border-radius:8px;">{opp.type}</span>
                {#if opp.deadline}
                  <span style="font-size:10px;color:#9CA3AF;font-family:var(--font-mono);">{opp.deadline}</span>
                {/if}
              </div>
              <div style="font-size:14px;font-weight:600;color:#1A1A2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{opp.title}</div>
              {#if opp.organization}
                <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">{opp.organization}</div>
              {/if}
            </div>
            <div style="flex-shrink:0;width:56px;text-align:right;">
              <div style="font-size:10px;color:{sc};font-family:var(--font-mono);font-weight:700;margin-bottom:4px;">{opp.score}%</div>
              <div style="height:3px;background:#E8E8E8;border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:{opp.score}%;background:{sc};border-radius:2px;"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if phase==="done" && streamedOpps.length>0}
      <button onclick={() => onResults(streamedOpps.length)} class="btn-primary" style="width:100%;">
        View Full Results &amp; Details →
      </button>
    {/if}

    {#if phase==="done" && skippedEmails.length>0}
      <div style="margin-top:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="height:1px;flex:1;background:#E8E8E8;"></div>
          <span class="section-label" style="white-space:nowrap;">{skippedEmails.length} email{skippedEmails.length!==1?"s":""} filtered out</span>
          <div style="height:1px;flex:1;background:#E8E8E8;"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          {#each skippedEmails as sk}
            <div class="card" style="padding:12px 16px;display:flex;gap:10px;align-items:flex-start;">
              <div class="skip-icon">✕</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;font-weight:600;color:#6B7280;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{sk.preview}</div>
                <div style="font-size:11px;color:#9CA3AF;">
                  <span style="color:#EF5350;font-weight:600;">Reason: </span>{sk.reason}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if error}
      <div class="error-box" style="margin-top:16px;">{error}</div>
    {/if}
  {/if}
</div>

<style>
  .page-title {
    font-size: 24px;
    font-weight: 700;
    color: #1A1A2E;
    margin: 0 0 6px 0;
    letter-spacing: -0.02em;
  }
  .page-subtitle {
    color: #9CA3AF;
    margin: 0;
    font-size: 14px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 700;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .card {
    background: #FFFFFF;
    border: 1px solid #E8E8E8;
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: box-shadow 0.2s;
  }
  .btn-primary {
    padding: 13px;
    background: #2196F3;
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(33,150,243,0.25);
    transition: all 0.2s;
  }
  .btn-primary:hover {
    background: #1976D2;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(33,150,243,0.35);
  }
  .btn-outline {
    padding: 7px 16px;
    border-radius: 10px;
    border: 1px solid #E8E8E8;
    background: white;
    color: #6B7280;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
  }
  .btn-outline:hover {
    border-color: #D1D5DB;
    color: #374151;
  }
  .btn-subtle {
    font-size: 12px;
    color: #2196F3;
    background: white;
    border: 1px solid #BBDEFB;
    cursor: pointer;
    padding: 5px 12px;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .btn-subtle:hover {
    background: #E3F2FD;
  }
  .textarea-input {
    width: 100%;
    min-height: 220px;
    background: #FAFAFA;
    border: 1.5px solid #E8E8E8;
    border-radius: 12px;
    color: #1A1A2E;
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 16px;
    resize: vertical;
    line-height: 1.7;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .textarea-input:focus {
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33,150,243,0.1);
  }
  .textarea-input::placeholder {
    color: #D1D5DB;
  }
  .email-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #E3F2FD;
    border: 1px solid #BBDEFB;
    border-radius: 20px;
    padding: 3px 12px;
    font-size: 12px;
    color: #1976D2;
    font-weight: 600;
  }
  .email-index-badge {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #E3F2FD;
    border: 1px solid #BBDEFB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: #1976D2;
    margin-top: 2px;
  }
  .error-box {
    background: #FFEBEE;
    border: 1px solid #FFCDD2;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    color: #EF5350;
    font-size: 13px;
  }
  .step-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    font-family: var(--font-mono);
    background: #F5F5F5;
    border: 1.5px solid #E8E8E8;
    color: #9CA3AF;
    transition: all 0.3s ease;
  }
  .step-dot.done {
    background: #2196F3;
    border-color: #2196F3;
    color: white;
  }
  .step-dot.active {
    border-color: #2196F3;
    color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33,150,243,0.15);
  }
  .log-box {
    padding: 16px;
    margin-bottom: 20px;
    font-family: var(--font-mono);
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .log-icon {
    flex-shrink: 0;
    font-weight: 700;
    color: #9CA3AF;
  }
  .log-icon.found { color: #4CAF50; }
  .log-icon.analyzing { color: #2196F3; }
  .log-icon.log-done { color: #9C27B0; }
  .log-icon.skipped { color: #D1D5DB; }
  .log-text {
    color: #6B7280;
    line-height: 1.5;
  }
  .log-text.found { color: #374151; }
  .log-text.skipped { color: #D1D5DB; }
  .result-card {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    animation: slideIn 0.35s ease;
  }
  .skip-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #FFEBEE;
    border: 1px solid #FFCDD2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #EF5350;
    font-weight: 700;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
