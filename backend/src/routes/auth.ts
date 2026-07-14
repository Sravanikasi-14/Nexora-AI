import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { AuthedRequest, requireAuth } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid token payload");
  return payload;
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(
    passwordRegex,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
  ),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists." });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      lastLogin: new Date(),
    }
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  if (user.provider === "google") {
    return res.status(400).json({
      error: "This account uses Google sign-in. Please continue with Google.",
    });
  }

  if (!user.password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid email or password." });

  // Update lastLogin
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
});

const googleAuthSchema = z.object({ idToken: z.string().min(1) });

router.post("/google", async (req, res) => {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { idToken } = parsed.data;

  try {
    const payload = await verifyGoogleIdToken(idToken);
    const { email, name, sub: googleId, picture: avatar } = payload;

    if (!email) {
      return res.status(400).json({ error: "Email is required from Google sign-in." });
    }

    // Check if user already exists by googleId
    console.log(`[GoogleAuth] Starting lookup sequence. Email: ${email}, Google ID (sub): ${googleId}`);

    // a. Look up User by googleId first
    const userByGoogleId = await prisma.user.findUnique({ where: { googleId } });
    if (userByGoogleId) {
      console.log(`[GoogleAuth] Branch A: Returning Google user found by googleId (${googleId}). Email: ${userByGoogleId.email}`);
      const updatedUser = await prisma.user.update({
        where: { id: userByGoogleId.id },
        data: { lastLogin: new Date(), avatar: avatar || userByGoogleId.avatar },
      });
      const token = signToken({ userId: updatedUser.id, email: updatedUser.email });
      return res.json({
        token,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          passwordSetupRequired: !updatedUser.password,
        }
      });
    }

    // b. If no user has that googleId, look up by email
    const userByEmail = await prisma.user.findUnique({ where: { email } });
    if (userByEmail) {
      if (userByEmail.provider === "credentials" || !userByEmail.googleId) {
        console.log(`[GoogleAuth] Branch B1: Account conflict. User exists by email (${email}) but provider is credentials or googleId is missing.`);
        return res.status(400).json({
          error: "An account with this email already exists using password sign-in. Please log in with your password.",
        });
      }

      if (userByEmail.provider === "google") {
        console.log(`[GoogleAuth] Branch B2: Data inconsistency. User exists by email (${email}) with Google provider but mismatched/missing googleId. Updating googleId to ${googleId}.`);
        const updatedUser = await prisma.user.update({
          where: { id: userByEmail.id },
          data: { googleId, provider: "google", lastLogin: new Date(), avatar: avatar || userByEmail.avatar },
        });
        const token = signToken({ userId: updatedUser.id, email: updatedUser.email });
        return res.json({
          token,
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            passwordSetupRequired: !updatedUser.password,
          }
        });
      }
    }

    // c. If no user has either googleId or email, register new user
    console.log(`[GoogleAuth] Branch C: Creating new user with Google login. Email: ${email}, Name: ${name}`);
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        provider: "google",
        googleId,
        password: null,
        avatar,
        lastLogin: new Date(),
      },
    });

    const token = signToken({ userId: newUser.id, email: newUser.email });
    return res.json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        passwordSetupRequired: !newUser.password,
      }
    });
  } catch (err) {
    console.error("Google authentication failed:", err);
    return res.status(401).json({ error: "Invalid Google ID token." });
  }
});

// Setup Password route for first-time Google users
const setupPasswordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters.").regex(
  passwordRegex,
  "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
) });

router.post("/setup-password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = setupPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { password } = parsed.data;

  try {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: req.userId! },
      data: { password: hashed },
    });
    console.log(`[GoogleAuth] Password successfully set up for user: ${req.userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to setup password:", err);
    res.status(500).json({ error: "Failed to setup password." });
  }
});

// Forgot password link generation
const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email } = parsed.data;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to prevent email enumeration
      return res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
    }

    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour expiration

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    });

    console.log(`\n========================================`);
    console.log(`[Nexora Mailer Simulator] Password Reset Link for ${email}:`);
    console.log(`http://localhost:3000/reset-password?token=${token}`);
    console.log(`========================================\n`);

    res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
  } catch (err) {
    console.error("Forgot password failed:", err);
    res.status(500).json({ error: "Failed to request password reset." });
  }
});

// Reset password with token
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").regex(
    passwordRegex,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
  ),
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { token, password } = parsed.data;
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password failed:", err);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// Profile endpoints
router.get("/profile", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: "User not found." });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified,
      }
    });
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional().nullable(),
});

router.patch("/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: parsed.data,
    });

    res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar,
        provider: updated.provider,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        lastLogin: updated.lastLogin,
        emailVerified: updated.emailVerified,
      }
    });
  } catch (err) {
    console.error("Failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Logout endpoint (requested by prompt specifications)
router.post("/logout", async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
