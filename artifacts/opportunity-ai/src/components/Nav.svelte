<script lang="ts">
  interface Props {
    page: string;
    navigate: (p: string) => void;
    resultCount: number;
    authedUser: string | null;
    onLogout: () => void;
  }
  let { page, navigate, resultCount, authedUser, onLogout }: Props = $props();
</script>

<nav class="nav-bar">
  <div class="max-w-4xl mx-auto px-4 flex items-center justify-between" style="height: 56px;">
    <!-- Logo -->
    <button onclick={() => navigate("home")} class="flex items-center gap-2" style="background:none;border:none;cursor:pointer;padding:0;outline:none;">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" stroke-width="1.5" fill="none"/>
          <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="white"/>
        </svg>
      </div>
      <span class="logo-text">
        Opportunity<span style="color:#2196F3;">AI</span>
      </span>
    </button>

    <!-- Nav links -->
    <div class="flex items-center gap-1">
      {#if authedUser}
        {#each [
          { key: "home", label: "Analyze" },
          { key: "results", label: "Inbox" + (resultCount > 0 ? ` (${resultCount})` : "") },
          { key: "profile", label: "Profile" },
        ] as item}
          <button
            onclick={() => navigate(item.key)}
            class="nav-link"
            class:active={page === item.key}
          >
            {item.label}
          </button>
        {/each}

        <div class="nav-divider">
          <span class="user-badge">
            <div class="online-dot"></div>
            {authedUser}
          </span>
          <button onclick={onLogout} class="logout-btn">
            Logout
          </button>
        </div>
      {:else}
        <button onclick={() => navigate("login")} class="nav-link">
          Sign in
        </button>
        <button onclick={() => navigate("register")} class="cta-btn">
          Get Started
        </button>
      {/if}
    </div>
  </div>
</nav>

<style>
  .nav-bar {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid #E8E8E8;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #1976D2, #2196F3);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-text {
    font-weight: 700;
    font-size: 16px;
    color: #1A1A2E;
    letter-spacing: -0.03em;
  }
  .nav-link {
    padding: 6px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    background: transparent;
    color: #6B7280;
  }
  .nav-link:hover {
    background: #F3F4F6;
    color: #1A1A2E;
  }
  .nav-link.active {
    background: #E3F2FD;
    color: #1976D2;
    font-weight: 600;
  }
  .nav-divider {
    margin-left: 8px;
    padding-left: 12px;
    border-left: 1px solid #E8E8E8;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .user-badge {
    font-size: 12px;
    color: #6B7280;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .online-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4CAF50;
    box-shadow: 0 0 6px rgba(76, 175, 80, 0.4);
  }
  .logout-btn {
    background: transparent;
    border: none;
    color: #9CA3AF;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .logout-btn:hover {
    color: #EF5350;
    background: #FFEBEE;
  }
  .cta-btn {
    padding: 7px 18px;
    background: #2196F3;
    border: none;
    border-radius: 10px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    transition: all 0.2s;
  }
  .cta-btn:hover {
    background: #1976D2;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
  }
</style>
