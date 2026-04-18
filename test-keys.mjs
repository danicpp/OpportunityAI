

const keys = [
  "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",
  "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",
  "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"
];

async function testKey(key, index) {
  try {
    const start = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: "Reply 'OK' if you can read this." }]
      })
    });
    const text = await res.text();
    const time = Date.now() - start;
    if (res.ok) {
        console.log(`[Key ${index + 1}] Success! (${time}ms) Response:`, JSON.parse(text).choices[0].message.content);
        return true;
    } else {
        console.error(`[Key ${index + 1}] Error: ${res.status}`, text);
        return false;
    }
  } catch (e) {
    console.error(`[Key ${index + 1}] Request failed:`, e);
    return false;
  }
}

async function run() {
  console.log("Starting parallel test of 3 OpenRouter keys...");
  const results = await Promise.all(keys.map((key, index) => testKey(key, index)));
  console.log("Test finished.");
}

run();
