<script lang="ts">
  interface Props {
    onLoginSuccess: (profileId: string, username: string) => void;
    navigate: (page: string) => void;
  }
  let { onLoginSuccess, navigate }: Props = $props();

  let username = $state("");
  let password = $state("");
  let errorMsg = $state("");
  let loading  = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    errorMsg = "";
    loading = true;

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

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
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
        </svg>
      </div>
      <h1 class="auth-title">Welcome Back</h1>
      <p class="auth-subtitle">Sign in to access your opportunity dashboard</p>
    </div>

    {#if errorMsg}
      <div class="auth-error">{errorMsg}</div>
    {/if}

    <form onsubmit={handleLogin} class="auth-form">
      <div class="form-group">
        <label for="username" class="form-label">Username</label>
        <input id="username" type="text" required bind:value={username} class="form-input" placeholder="Enter your username" />
      </div>

      <div class="form-group">
        <label for="password" class="form-label">Password</label>
        <input id="password" type="password" required bind:value={password} class="form-input" placeholder="Enter your password" />
      </div>

      <button type="submit" disabled={loading} class="auth-submit">
        {loading ? "Authenticating..." : "Sign In"}
      </button>
    </form>

    <p class="auth-switch">
      Don't have an account? 
      <button onclick={() => navigate("register")} class="auth-switch-link">Sign up</button>
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
    background: #2196F3;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    margin-top: 4px;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
  }
  .auth-submit:hover {
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
