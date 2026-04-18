<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "../lib/api";
  import type { ScoredOpportunity } from "../lib/types";

  interface Props { onBack: () => void; }
  let { onBack }: Props = $props();

  let opportunities = $state<ScoredOpportunity[]>([]);
  let loading       = $state(true);
  let error         = $state("");
  let expandedId    = $state<string | null>(null);
  let clearing      = $state(false);
  let showEmail     = $state<string | null>(null);

  onMount(() => loadOpportunities());

  async function loadOpportunities() {
    loading = true; error = "";
    try {
      const r = await api.getOpportunities();
      opportunities = r.opportunities || [];
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Failed to load.";
    } finally { loading = false; }
  }

  async function clearAll() {
    if (!confirm("Clear all results?")) return;
    clearing = true;
    try { await api.clearOpportunities(); opportunities = []; } catch {}
    clearing = false;
  }

  function getDaysLeft(deadline?: string) {
    if (!deadline) return null;
    try {
      const d = new Date(deadline);
      const t = new Date(); t.setHours(0,0,0,0);
      const days = Math.floor((d.getTime()-t.getTime())/86400000);
      if (days<0)  return {days,label:"Expired",   color:"#9CA3AF",bg:"#F5F5F5"};
      if (days===0) return {days,label:"Due today", color:"#EF5350",bg:"#FFEBEE"};
      if (days<=3)  return {days,label:`${days}d`,  color:"#EF5350",bg:"#FFEBEE"};
      if (days<=14) return {days,label:`${days}d`,  color:"#FF9800",bg:"#FFF3E0"};
      return               {days,label:`${days}d`,  color:"#4CAF50",bg:"#E8F5E9"};
    } catch { return null; }
  }

  function scoreColor(s: number) {
    if (s>=75) return "#4CAF50";
    if (s>=50) return "#2196F3";
    if (s>=30) return "#FF9800";
    return "#EF5350";
  }

  function typeStyle(t: string) {
    const m: Record<string,{c:string;b:string}> = {
      internship: {c:"#2196F3",b:"#E3F2FD"},
      hackathon:  {c:"#FF9800",b:"#FFF3E0"},
      scholarship:{c:"#4CAF50",b:"#E8F5E9"},
      competition:{c:"#FF5722",b:"#FBE9E7"},
      job:        {c:"#9C27B0",b:"#F3E5F5"},
      fellowship: {c:"#009688",b:"#E0F2F1"},
    };
    return m[t?.toLowerCase()] ?? {c:"#6B7280",b:"#F5F5F5"};
  }

  function ringCirc(r: number) { return 2 * Math.PI * r; }
  function ringOffset(pct: number, r: number) { return ringCirc(r) - (pct/100) * ringCirc(r); }

  function dimColor(val: number, max: number) {
    const r = val/max;
    if (r>=0.7) return "#4CAF50";
    if (r>=0.4) return "#2196F3";
    return "#FF9800";
  }

  const DIMS = [
    {key:"typeMatch",        label:"Type",        max:30, icon:"◈"},
    {key:"skillMatch",       label:"Skills",      max:25, icon:"⚙"},
    {key:"eligibilityMatch", label:"Eligibility", max:20, icon:"✓"},
    {key:"deadlineUrgency",  label:"Urgency",     max:15, icon:"⏱"},
    {key:"locationMatch",    label:"Location",    max:5,  icon:"◎"},
    {key:"completeness",     label:"Complete",    max:5,  icon:"⬡"},
  ];
</script>

<div class="animate-fade-in">
  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
    <div>
      <h1 class="page-title">Opportunities</h1>
      <p class="page-subtitle" data-testid="results-count">
        {#if loading}Loading…{:else}{opportunities.length} opportunit{opportunities.length===1?"y":"ies"} ranked by priority{/if}
      </p>
    </div>
    <div style="display:flex;gap:8px;">
      {#if opportunities.length>0}
        <button onclick={clearAll} disabled={clearing} data-testid="button-clear-all" class="btn-danger">
          {clearing?"Clearing…":"Clear all"}
        </button>
      {/if}
      <button onclick={onBack} data-testid="button-back" class="btn-outline">+ Analyze more</button>
    </div>
  </div>

  {#if loading}
    <div style="text-align:center;padding:80px;color:#9CA3AF;font-size:14px;">Loading results…</div>

  {:else if error}
    <div class="error-box" data-testid="error-results">{error}</div>

  {:else if opportunities.length===0}
    <div class="empty-state">
      <div style="font-size:48px;margin-bottom:16px;color:#E8E8E8;">◈</div>
      <p style="color:#9CA3AF;font-size:14px;margin:0 0 24px 0;">No opportunities yet. Analyze your emails first.</p>
      <button onclick={onBack} class="btn-primary">Analyze Emails</button>
    </div>

  {:else}
    <div style="display:flex;flex-direction:column;gap:12px;" class="stagger">
      {#each opportunities as opp}
        {@const dl  = getDaysLeft(opp.deadline)}
        {@const sc  = scoreColor(opp.score)}
        {@const ts  = typeStyle(opp.type)}
        {@const exp = expandedId === opp.id}
        {@const R   = 24}
        {@const circ= ringCirc(R)}

        <div class="card opp-card" class:expanded={exp} data-testid={`card-opportunity-${opp.id}`}>

          <!-- Card header — progressive disclosure: title + why it matters -->
          <button onclick={() => expandedId = exp ? null : opp.id}
            data-testid={`button-expand-${opp.id}`}
            class="opp-header">

            <!-- Score ring -->
            <div style="flex-shrink:0;position:relative;width:56px;height:56px;">
              <svg width="56" height="56" viewBox="0 0 56 56" style="transform:rotate(-90deg);">
                <circle cx="28" cy="28" r={R} stroke="#E8E8E8" stroke-width="3.5" fill="none"/>
                <circle cx="28" cy="28" r={R} stroke={sc} stroke-width="3.5" fill="none"
                  stroke-linecap="round"
                  stroke-dasharray={circ}
                  stroke-dashoffset={ringOffset(opp.score, R)}
                  style="transition:stroke-dashoffset 0.7s ease;"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <span data-testid={`score-${opp.id}`} style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:{sc};line-height:1;">{opp.score}</span>
                <span style="font-size:9px;color:#9CA3AF;line-height:1;margin-top:1px;">#{opp.rank}</span>
              </div>
            </div>

            <!-- Title & type (always visible) -->
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
                <span data-testid={`type-badge-${opp.id}`} class="type-badge" style="color:{ts.c};background:{ts.b};">
                  {opp.type}
                </span>
                {#if dl}
                  <span class="deadline-badge" style="color:{dl.color};background:{dl.bg};">
                    ⏱ {dl.label}
                  </span>
                {/if}
              </div>
              <div data-testid={`title-${opp.id}`} style="font-size:14px;font-weight:600;color:#1A1A2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{opp.title}</div>
              {#if opp.organization}
                <div style="font-size:12px;color:#9CA3AF;margin-top:2px;">{opp.organization}</div>
              {/if}
              <!-- "Why it matters" preview -->
              {#if !exp && (opp.explanation.reasons as string[] || []).length > 0}
                <div style="font-size:12px;color:#6B7280;margin-top:6px;display:flex;align-items:center;gap:4px;">
                  <span style="color:#4CAF50;">✓</span> {(opp.explanation.reasons as string[])[0]}
                </div>
              {/if}
            </div>

            <!-- Chevron -->
            <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <span style="font-family:var(--font-mono);font-size:11px;color:{sc};font-weight:700;">{opp.score}%</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#9CA3AF"
                style="transform:{exp?'rotate(180deg)':'rotate(0)'};transition:transform 0.2s;">
                <path d="M4.427 6.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 6H4.604a.25.25 0 0 0-.177.427z"/>
              </svg>
            </div>
          </button>

          <!-- Expanded details (progressive disclosure) -->
          {#if exp}
            <div class="opp-details">

              <!-- Score Breakdown -->
              <p class="detail-label">Score Breakdown</p>
              <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:24px;">
                {#each DIMS as dim}
                  {@const val   = (opp.scoreBreakdown as Record<string,number>)[dim.key] || 0}
                  {@const pct   = Math.round(Math.max(0,val)/dim.max*100)}
                  {@const color = dimColor(val, dim.max)}
                  {@const r2    = 18}
                  {@const c2    = ringCirc(r2)}
                  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <div style="position:relative;width:44px;height:44px;">
                      <svg width="44" height="44" viewBox="0 0 44 44" style="transform:rotate(-90deg);">
                        <circle cx="22" cy="22" r={r2} stroke="#E8E8E8" stroke-width="3" fill="none"/>
                        <circle cx="22" cy="22" r={r2} stroke={color} stroke-width="3" fill="none"
                          stroke-linecap="round"
                          stroke-dasharray={c2}
                          stroke-dashoffset={ringOffset(pct, r2)}
                          style="transition:stroke-dashoffset 0.6s ease;"/>
                      </svg>
                      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                        <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:{color};">{pct}%</span>
                      </div>
                    </div>
                    <div style="text-align:center;">
                      <div style="font-size:10px;font-weight:600;color:#6B7280;">{dim.label}</div>
                      <div style="font-size:9px;font-family:var(--font-mono);color:#9CA3AF;">{val}/{dim.max}</div>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Why + Risks -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                {#if (opp.explanation.reasons as string[] ||[]).length>0}
                  <div class="detail-box">
                    <p class="detail-label" style="color:#4CAF50;">Why ranked high</p>
                    <ul class="detail-list">
                      {#each (opp.explanation.reasons as string[]) as r}
                        <li><span style="color:#4CAF50;">✓</span>{r}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                <div style="display:flex;flex-direction:column;gap:10px;">
                  {#if (opp.explanation.riskAlerts as string[] ||[]).length>0}
                    <div class="detail-box warning">
                      <p class="detail-label" style="color:#EF5350;">⚠ Risk Alerts</p>
                      <ul class="detail-list">
                        {#each (opp.explanation.riskAlerts as string[]) as r}
                          <li style="color:#EF5350;"><span>–</span>{r}</li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                  {#if (opp.explanation.missing as string[] ||[]).length>0}
                    <div class="detail-box">
                      <p class="detail-label" style="color:#FF9800;">Missing</p>
                      <ul class="detail-list">
                        {#each (opp.explanation.missing as string[]) as m}
                          <li style="color:#FF9800;"><span>–</span>{m}</li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Next Steps -->
              {#if (opp.explanation.nextSteps as string[] ||[]).length>0}
                <div class="detail-box" style="margin-bottom:16px;">
                  <p class="detail-label" style="color:#2196F3;">Next Steps</p>
                  <ol class="detail-list">
                    {#each (opp.explanation.nextSteps as string[]) as s, si}
                      <li>
                        <span class="step-num">{si+1}</span>
                        {s}
                      </li>
                    {/each}
                  </ol>
                </div>
              {/if}

              <!-- Source Email -->
              {#if opp.sourceEmailText}
                <div class="detail-box" style="margin-bottom:16px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <p class="detail-label" style="color:#6B7280;">Original Source Email</p>
                    <button onclick={() => showEmail = showEmail === opp.id ? null : opp.id} class="btn-subtle-sm">
                      {showEmail === opp.id ? "Hide" : "Show"}
                    </button>
                  </div>
                  {#if showEmail === opp.id}
                    <pre class="email-preview">{opp.sourceEmailText}</pre>
                  {/if}
                </div>
              {/if}

              <!-- Requirements + Apply -->
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                {#if (opp.requirements||[]).length>0}
                  <div style="display:flex;flex-wrap:wrap;gap:5px;">
                    {#each opp.requirements as req}
                      <span class="req-tag">{req}</span>
                    {/each}
                  </div>
                {/if}
                {#if opp.link}
                  <a href={opp.link} target="_blank" rel="noopener noreferrer"
                    data-testid={`button-apply-${opp.id}`}
                    class="btn-primary apply-btn">
                    Apply Now
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9L9 3M9 3H5M9 3V7" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </a>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page-title {
    font-size: 24px; font-weight: 700; color: #1A1A2E; margin: 0 0 4px 0; letter-spacing: -0.02em;
  }
  .page-subtitle {
    color: #9CA3AF; margin: 0; font-size: 13px;
  }
  .card {
    background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; transition: all 0.2s;
  }
  .opp-card.expanded {
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    border-color: #D1D5DB;
  }
  .opp-header {
    width: 100%; padding: 18px 20px; background: none; border: none; cursor: pointer;
    text-align: left; display: flex; align-items: center; gap: 16px;
  }
  .opp-details {
    border-top: 1px solid #F0F0F0; padding: 22px; animation: expandIn 0.2s ease;
  }
  .detail-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    margin: 0 0 10px 0; color: #9CA3AF;
  }
  .detail-box {
    background: #FAFAFA; border: 1px solid #F0F0F0; border-radius: 12px; padding: 14px;
  }
  .detail-box.warning {
    background: #FFEBEE; border-color: #FFCDD2;
  }
  .detail-list {
    margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px;
  }
  .detail-list li {
    font-size: 12px; color: #374151; display: flex; gap: 6px; align-items: flex-start; line-height: 1.5;
  }
  .detail-list li span {
    flex-shrink: 0;
  }
  .step-num {
    font-family: var(--font-mono); font-size: 10px; color: #2196F3; background: #E3F2FD;
    padding: 1px 8px; border-radius: 6px; flex-shrink: 0;
  }
  .type-badge {
    padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .deadline-badge {
    padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 600;
  }
  .req-tag {
    font-size: 11px; padding: 3px 10px; background: #F5F5F5; border: 1px solid #E8E8E8;
    border-radius: 8px; color: #6B7280; font-family: var(--font-mono);
  }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px;
    background: #2196F3; border-radius: 10px; color: white; text-decoration: none;
    font-size: 13px; font-weight: 600; border: none; cursor: pointer;
    box-shadow: 0 2px 8px rgba(33,150,243,0.25); transition: all 0.2s;
  }
  .btn-primary:hover {
    background: #1976D2; transform: translateY(-1px);
  }
  .apply-btn {
    white-space: nowrap;
  }
  .btn-outline {
    padding: 7px 16px; border-radius: 10px; border: 1px solid #E8E8E8; background: white;
    color: #6B7280; cursor: pointer; font-size: 13px;
  }
  .btn-outline:hover { border-color: #D1D5DB; color: #374151; }
  .btn-danger {
    padding: 7px 16px; border-radius: 10px; border: 1px solid #FFCDD2; background: white;
    color: #EF5350; cursor: pointer; font-size: 13px;
  }
  .btn-danger:hover { background: #FFEBEE; }
  .btn-subtle-sm {
    font-size: 11px; color: #2196F3; background: none; border: none; cursor: pointer;
    font-weight: 600; padding: 2px 4px;
  }
  .btn-subtle-sm:hover { color: #1976D2; }
  .empty-state {
    text-align: center; padding: 80px 20px; background: white; border: 1px solid #E8E8E8;
    border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .error-box {
    background: #FFEBEE; border: 1px solid #FFCDD2; border-radius: 12px; padding: 16px;
    color: #EF5350; font-size: 13px;
  }
  .email-preview {
    font-size: 11px; color: #6B7280; line-height: 1.6; margin: 10px 0 0 0;
    white-space: pre-wrap; font-family: var(--font-mono); background: #FFFFFF;
    padding: 12px; border-radius: 8px; max-height: 150px; overflow-y: auto;
    border: 1px solid #F0F0F0;
  }
  @keyframes expandIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
