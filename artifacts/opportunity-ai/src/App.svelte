<script lang="ts">
  import { onMount, tick } from "svelte";
  import Nav from "./components/Nav.svelte";
  import Home from "./pages/Home.svelte";
  import Profile from "./pages/Profile.svelte";
  import Results from "./pages/Results.svelte";
  import Login from "./pages/Login.svelte";
  import Register from "./pages/Register.svelte";

  export type Page = "home" | "profile" | "results" | "login" | "register";

  let page = $state<Page>("home");
  let resultCount = $state(0);
  let authedUser = $state<string | null>(null);

  function navigate(target: string) {
    if ((target === "profile" || target === "results") && !authedUser) {
      target = "login";
    }
    if ((target === "login" || target === "register") && authedUser) {
      target = "home";
    }
    page = target as Page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onResultsReady(count: number) {
    resultCount = count;
    navigate("results");
  }

  function onLoginSuccess(profileId: string, username: string) {
    authedUser = username;
    navigate("home");
  }

  function onLogout() {
    localStorage.removeItem("session_token");
    localStorage.removeItem("session_profileId");
    localStorage.removeItem("session_username");
    authedUser = null;
    navigate("login");
  }

  onMount(() => {
    // Check auth
    const savedUser = localStorage.getItem("session_username");
    if (savedUser) authedUser = savedUser;

    const hash = window.location.hash.replace("#", "") || "home";
    navigate(hash);
  });

  $effect(() => {
    window.location.hash = page;
  });
</script>

<div class="min-h-screen" style="background: #FAFAFA;">
  <Nav {page} {navigate} {resultCount} {authedUser} {onLogout} />
  <main class="max-w-4xl mx-auto px-4 py-8">
    {#if page === "home"}
      <Home onResults={onResultsReady} profileId={localStorage.getItem("session_profileId") || undefined} />
    {:else if page === "profile"}
      <Profile />
    {:else if page === "results"}
      <Results onBack={() => navigate("home")} />
    {:else if page === "login"}
      <Login {navigate} {onLoginSuccess} />
    {:else if page === "register"}
      <Register {navigate} {onLoginSuccess} />
    {/if}
  </main>
</div>
