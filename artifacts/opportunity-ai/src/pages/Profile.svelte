<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "../lib/api";
  import type { StudentProfileInput } from "../lib/types";

  let loading = $state(false);
  let saving = $state(false);
  let saved = $state(false);
  let error = $state("");

  let form = $state<StudentProfileInput>({
    degree: "",
    semester: 4,
    cgpa: 3.0,
    skills: [],
    interests: [],
    preferredTypes: [],
    locationPreference: "Remote",
    financialNeed: false,
  });

  let skillInput = $state("");
  let interestInput = $state("");

  const OPP_TYPES = ["internship", "hackathon", "scholarship", "competition", "job", "fellowship"];

  onMount(async () => {
    loading = true;
    try {
      const profile = await api.getProfile();
      form = {
        degree: profile.degree,
        semester: profile.semester,
        cgpa: profile.cgpa,
        skills: profile.skills,
        interests: profile.interests,
        preferredTypes: profile.preferredTypes,
        locationPreference: profile.locationPreference,
        financialNeed: profile.financialNeed,
      };
    } catch {
      // No profile yet — start fresh
    } finally {
      loading = false;
    }
  });

  function addTag(field: "skills" | "interests", input: string, setInput: (v: string) => void) {
    const tags = input.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
    const current = form[field] as string[];
    form[field] = [...new Set([...current, ...tags])];
    setInput("");
  }

  function removeTag(field: "skills" | "interests", tag: string) {
    form[field] = (form[field] as string[]).filter((t) => t !== tag);
  }

  function toggleType(type: string) {
    const current = form.preferredTypes;
    if (current.includes(type)) {
      form.preferredTypes = current.filter((t) => t !== type);
    } else {
      form.preferredTypes = [...current, type];
    }
  }

  async function save() {
    if (!form.degree.trim()) { error = "Degree is required."; return; }
    error = "";
    saving = true;
    saved = false;
    try {
      await api.saveProfile(form);
      saved = true;
      setTimeout(() => (saved = false), 3000);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Failed to save profile.";
    } finally {
      saving = false;
    }
  }
</script>

<div class="animate-fade-in">
  <div style="margin-bottom:28px;">
    <h1 class="page-title">Student Profile</h1>
    <p class="page-subtitle">
      Your profile is used to personalize scoring. Opportunities are ranked by how well they match your background.
    </p>
  </div>

  {#if loading}
    <div style="text-align:center;padding:40px;color:#9CA3AF;">Loading profile...</div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:16px;">

      <!-- Academic -->
      <section class="card" style="padding:22px;">
        <h2 class="section-label" style="margin:0 0 18px 0;">Academic Info</h2>
        <div class="grid grid-cols-3 gap-4">
          <div style="grid-column:span 3 / span 1;">
            <label class="form-label">Degree</label>
            <input bind:value={form.degree} placeholder="e.g. BS Computer Science" data-testid="input-degree" class="form-input" />
          </div>
          <div>
            <label class="form-label">Semester</label>
            <select bind:value={form.semester} data-testid="select-semester" class="form-input">
              {#each [1,2,3,4,5,6,7,8] as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="form-label">CGPA</label>
            <input type="number" min="0" max="4" step="0.01" bind:value={form.cgpa} data-testid="input-cgpa" class="form-input" />
          </div>
          <div>
            <label class="form-label">Location Preference</label>
            <select bind:value={form.locationPreference} data-testid="select-location" class="form-input">
              <option>Remote</option>
              <option>Onsite</option>
              <option>Both</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Skills -->
      <section class="card" style="padding:22px;">
        <h2 class="section-label" style="margin:0 0 18px 0;">Skills</h2>
        <div class="flex flex-wrap gap-2 mb-3">
          {#each form.skills as skill}
            <span class="tag-chip">
              {skill}
              <button onclick={() => removeTag("skills", skill)} class="tag-remove">×</button>
            </span>
          {/each}
        </div>
        <div class="flex gap-2">
          <input bind:value={skillInput} placeholder="Python, React, SQL, ..."
            data-testid="input-skills"
            onkeydown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("skills", skillInput, (v) => skillInput = v); } }}
            class="form-input" style="flex:1;" />
          <button onclick={() => addTag("skills", skillInput, (v) => skillInput = v)} class="btn-add blue" data-testid="button-add-skill">Add</button>
        </div>
        <p style="font-size:11px;color:#9CA3AF;margin:6px 0 0;">Separate with comma or press Enter</p>
      </section>

      <!-- Interests -->
      <section class="card" style="padding:22px;">
        <h2 class="section-label" style="margin:0 0 18px 0;">Interests</h2>
        <div class="flex flex-wrap gap-2 mb-3">
          {#each form.interests as interest}
            <span class="tag-chip green">
              {interest}
              <button onclick={() => removeTag("interests", interest)} class="tag-remove green">×</button>
            </span>
          {/each}
        </div>
        <div class="flex gap-2">
          <input bind:value={interestInput} placeholder="AI, Hackathons, Web Dev, ..."
            data-testid="input-interests"
            onkeydown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("interests", interestInput, (v) => interestInput = v); } }}
            class="form-input" style="flex:1;" />
          <button onclick={() => addTag("interests", interestInput, (v) => interestInput = v)} class="btn-add green" data-testid="button-add-interest">Add</button>
        </div>
      </section>

      <!-- Preferred Types -->
      <section class="card" style="padding:22px;">
        <h2 class="section-label" style="margin:0 0 18px 0;">Preferred Opportunity Types</h2>
        <div class="flex flex-wrap gap-2">
          {#each OPP_TYPES as type}
            {@const selected = form.preferredTypes.includes(type)}
            <button onclick={() => toggleType(type)} data-testid={`toggle-type-${type}`} class="type-pill" class:selected>
              {type}
            </button>
          {/each}
        </div>
      </section>

      <!-- Financial Need -->
      <section class="card" style="padding:22px;">
        <div class="flex items-center justify-between">
          <div>
            <h2 style="font-size:14px;font-weight:600;color:#1A1A2E;margin:0 0 4px 0;">Financial Need</h2>
            <p style="font-size:12px;color:#9CA3AF;margin:0;">Boosts scholarship ranking in results</p>
          </div>
          <button onclick={() => form.financialNeed = !form.financialNeed} data-testid="toggle-financial-need" class="toggle" class:active={form.financialNeed}>
            <span class="toggle-knob"></span>
          </button>
        </div>
      </section>

      {#if error}
        <div class="error-box" data-testid="error-profile">{error}</div>
      {/if}

      {#if saved}
        <div class="success-box" data-testid="saved-success">Profile saved successfully.</div>
      {/if}

      <button onclick={save} disabled={saving} data-testid="button-save-profile" class="btn-save">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  {/if}
</div>

<style>
  .page-title { font-size: 24px; font-weight: 700; color: #1A1A2E; margin: 0 0 6px 0; letter-spacing: -0.02em; }
  .page-subtitle { color: #9CA3AF; margin: 0; font-size: 14px; }
  .section-label { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }
  .card { background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .form-label { display: block; font-size: 12px; color: #6B7280; font-weight: 500; margin-bottom: 6px; }
  .form-input { width: 100%; background: #FAFAFA; border: 1.5px solid #E8E8E8; border-radius: 10px; color: #1A1A2E; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
  .form-input:focus { border-color: #2196F3; box-shadow: 0 0 0 3px rgba(33,150,243,0.1); }
  .tag-chip { display: inline-flex; align-items: center; gap: 4px; background: #E3F2FD; border: 1px solid #BBDEFB; color: #1976D2; padding: 3px 10px; border-radius: 20px; font-size: 12px; }
  .tag-chip.green { background: #E8F5E9; border-color: #C8E6C9; color: #388E3C; }
  .tag-remove { background: none; border: none; cursor: pointer; color: #1976D2; padding: 0; line-height: 1; font-size: 14px; }
  .tag-remove.green { color: #388E3C; }
  .btn-add { padding: 9px 16px; border: 1px solid #BBDEFB; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
  .btn-add.blue { background: #E3F2FD; color: #1976D2; }
  .btn-add.blue:hover { background: #BBDEFB; }
  .btn-add.green { background: #E8F5E9; border-color: #C8E6C9; color: #388E3C; }
  .btn-add.green:hover { background: #C8E6C9; }
  .type-pill { padding: 7px 16px; border-radius: 20px; border: 1.5px solid #E8E8E8; background: white; color: #9CA3AF; cursor: pointer; font-size: 13px; text-transform: capitalize; transition: all 0.15s; }
  .type-pill.selected { border-color: #BBDEFB; background: #E3F2FD; color: #1976D2; font-weight: 600; }
  .type-pill:hover { border-color: #D1D5DB; }
  .toggle { width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer; background: #E8E8E8; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .toggle.active { background: #2196F3; }
  .toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: white; position: absolute; top: 3px; left: 3px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .toggle.active .toggle-knob { left: 23px; }
  .error-box { background: #FFEBEE; border: 1px solid #FFCDD2; border-radius: 12px; padding: 12px 16px; color: #EF5350; font-size: 13px; }
  .success-box { background: #E8F5E9; border: 1px solid #C8E6C9; border-radius: 12px; padding: 12px 16px; color: #4CAF50; font-size: 13px; }
  .btn-save { padding: 13px; background: #2196F3; border: none; border-radius: 12px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; box-shadow: 0 2px 8px rgba(33,150,243,0.25); transition: all 0.2s; }
  .btn-save:hover { background: #1976D2; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(33,150,243,0.35); }
  .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
