import { Router } from "express";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getUser, createUser } from "../lib/firestore";
import type { UserRecord } from "../lib/firestore";

const router = Router();

// Help utility for password hashing without dependencies
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hashStr: string): boolean {
  try {
    const [salt, key] = hashStr.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = scryptSync(password, salt, 64);
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    return false;
  }
}

router.post("/auth/register", async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const existingUser = await getUser(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Assign a dedicated profileId
    const profileId = randomUUID();
    const passwordHash = hashPassword(password);

    const userRecord: UserRecord = {
      id: username,
      username,
      passwordHash,
      profileId,
      createdAt: new Date().toISOString(),
    };

    await createUser(userRecord);

    const token = Buffer.from(`${username}:${profileId}`).toString("base64"); // Simple mock token mapping
    return res.json({ token, profileId, username });
  } catch (err: any) {
    req.log.error({ err }, "Registration failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await getUser(username);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = Buffer.from(`${username}:${user.profileId}`).toString("base64");
    return res.json({ token, profileId: user.profileId, username });
  } catch (err: any) {
    req.log.error({ err }, "Login failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
