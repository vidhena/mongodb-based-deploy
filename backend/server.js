require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "10kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." }
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    password: {
      type: String,
      required: true,
      select: false
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Register
app.post("/api/register", authLimiter, async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Please provide a valid name, email and password."
      });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({
        message: "Name must contain between 2 and 60 characters."
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain 8 to 72 characters."
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    return res.status(201).json({
      message: "Registration successful. You can now log in.",
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
});

// Login
app.post("/api/login", authLimiter, async (req, res) => {
  try {
    let { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Please enter your email and password."
      });
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Login successful.",
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  const token = authorization.slice(7);

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again."
    });
  }
}

// Protected welcome page API
app.get("/api/welcome", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    return res.json({
      message: `Welcome, ${user.name}!`,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Welcome request failed:", error.message);

    return res.status(500).json({
      message: "Unable to load your welcome page."
    });
  }
});

// Start server after connecting to MongoDB
async function startServer() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("Missing MONGODB_URI or JWT_SECRET environment variable.");
    process.exit(1);
  }

  if (!process.env.FRONTEND_URL) {
    console.error("Missing FRONTEND_URL environment variable.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    const port = process.env.PORT || 3000;

    app.listen(port, "0.0.0.0", () => {
      console.log(`Backend running on port ${port}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();