<script lang="ts">
  interface Props {
    onLoginSuccess: (profileId: string, username: string) => void;
    navigate: (page: string) => void;
  }
  let { onLoginSuccess, navigate }: Props = $props();

  let username = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let errorMsg = $state("");
  let loading  = $state(false);

  async function handleRegister(e: Event) {
    e.preventDefault();
    errorMsg = "";

    if (password !== confirmPassword) {
      errorMsg = "Passwords do not match.";
      return;
    }

    loading = true;

    try {
      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, confirmPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      localStorage.setItem("session_token", data.token);
      localStorage.setItem("session_profileId", data.profileId);
      localStorage.setItem("session_username", data.username);

      onLoginSuccess(data.profileId, data.username);
    } catch (e: any) {
      errorMsg = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="animate-fade-in auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2" stroke-linecap="round">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <h1 class="auth-title">Create Account</h1>
      <p class="auth-subtitle">Start analyzing your emails immediately</p>
    </div>

    {#if errorMsg}
      <div class="auth-error">{errorMsg}</div>
    {/if}

    <form onsubmit={handleRegister} class="auth-form">
      <div class="form-group">
        <label for="reg-username" class="form-label">Username</label>
        <input id="reg-username" type="text" required bind:value={username} class="form-input" placeholder="Choose a username" />
      </div>

      <div class="form-group">
        <label for="reg-password" class="form-label">Password</label>
        <input id="reg-password" type="password" required bind:value={password} class="form-input" placeholder="Create a password" />
      </div>

      <div class="form-group">
        <label for="reg-confpw" class="form-label">Confirm Password</label>
        <input id="reg-confpw" type="password" required bind:value={confirmPassword} class="form-input" placeholder="Confirm your password" />
      </div>

      <button type="submit" disabled={loading} class="auth-submit green">
        {loading ? "Registering..." : "Create Account"}
      </button>
    </form>

    <p class="auth-switch">
      Already have an account? 
      <button onclick={() => navigate("login")} class="auth-switch-link">Sign in</button>
    </p>
  </div>
</div>

<style>
  .auth-container {
    max-width: 400px;
    margin: 60px auto;
    padding: 0 16px;
  }
  .auth-card {
    background: #FFFFFF;
    padding: 36px;
    border-radius: 20px;
    border: 1px solid #E8E8E8;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  }
  .auth-header {
    text-align: center;
    margin-bottom: 28px;
  }
  .auth-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: #E3F2FD;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px auto;
  }
  .auth-title {
    color: #1A1A2E;
    font-size: 22px;
    margin: 0 0 6px 0;
    font-weight: 700;
  }
  .auth-subtitle {
    color: #9CA3AF;
    font-size: 14px;
    margin: 0;
  }
  .auth-error {
    background: #FFEBEE;
    border: 1px solid #FFCDD2;
    color: #EF5350;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    margin-bottom: 20px;
    text-align: center;
  }
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-label {
    color: #374151;
    font-size: 13px;
    font-weight: 600;
  }
  .form-input {
    width: 100%;
    background: #FAFAFA;
    border: 1.5px solid #E8E8E8;
    color: #1A1A2E;
    padding: 11px 14px;
    border-radius: 12px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  .form-input::placeholder {
    color: #D1D5DB;
  }
  .form-input:focus {
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  }
  .auth-submit {
    width: 100%;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    margin-top: 4px;
    transition: all 0.2s;
  }
  .auth-submit.green {
    background: #2196F3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
  }
  .auth-submit.green:hover {
    background: #1976D2;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(33, 150, 243, 0.4);
  }
  .auth-submit:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .auth-switch {
    text-align: center;
    margin: 24px 0 0 0;
    font-size: 13px;
    color: #9CA3AF;
  }
  .auth-switch-link {
    background: none;
    border: none;
    color: #2196F3;
    cursor: pointer;
    font-weight: 600;
    padding: 0;
  }
  .auth-switch-link:hover {
    color: #1976D2;
  }
</style>
