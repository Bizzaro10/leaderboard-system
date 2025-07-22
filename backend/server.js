require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://leaderboard-systemkira.netlify.app/",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "X-Requested-With",
    ],
    credentials: true,
  },
});

app.use(
  cors({
    origin: "https://leaderboard-systemkira.netlify.app/",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "X-Requested-With",
    ],
    preflightContinue: true,
  })
);
app.use(express.json());

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads/images"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + "-" + Date.now() + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });

// Serve uploaded images statically
app.use(
  "/uploads/images",
  express.static(path.join(__dirname, "uploads/images"))
);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Models
const userSchema = new mongoose.Schema({
  name: String,
  totalPoints: { type: Number, default: 0 },
  profileImage: { type: String, default: "" },
});
const User = mongoose.model("User", userSchema);

const claimHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  points: Number,
  claimedAt: { type: Date, default: Date.now },
});
const ClaimHistory = mongoose.model("ClaimHistory", claimHistorySchema);

// Seed users if none exist
const seedUsers = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    const names = [
      "Rahul",
      "Kamal",
      "Sanak",
      "Amit",
      "Priya",
      "Neha",
      "Vikas",
      "Sonia",
      "Ravi",
      "Anjali",
    ];
    await User.insertMany(names.map((name) => ({ name })));
    console.log("Seeded users");
  }
};
seedUsers();

// API Endpoints

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Add new user (with image upload)
app.post("/api/users", upload.single("profileImage"), async (req, res) => {
  const { name } = req.body;
  let profileImage = req.body.profileImage || "";
  if (req.file) {
    profileImage = `/uploads/images/${req.file.filename}`;
  }
  if (!name) return res.status(400).json({ error: "Name required" });
  const user = new User({ name, profileImage });
  await user.save();
  io.emit("leaderboardUpdate");
  res.json(user);
});

// Update user profile image (file upload or URL)
app.patch("/api/users/:id", upload.single("profileImage"), async (req, res) => {
  const { id } = req.params;
  let profileImage = req.body.profileImage || "";
  if (req.file) {
    profileImage = `/uploads/images/${req.file.filename}`;
  }
  const user = await User.findByIdAndUpdate(
    id,
    { profileImage },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  io.emit("leaderboardUpdate");
  res.json(user);
});

// Claim points
app.post("/api/claim", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const points = Math.floor(Math.random() * 10) + 1;
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { totalPoints: points } },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  const history = new ClaimHistory({ userId, points });
  await history.save();
  io.emit("leaderboardUpdate");
  res.json({ pointsAwarded: points, updatedUser: user });
});

// Get leaderboard
app.get("/api/leaderboard", async (req, res) => {
  const users = await User.find().sort({ totalPoints: -1 });
  const leaderboard = users.map((user, idx) => ({
    rank: idx + 1,
    ...user.toObject(),
  }));
  res.json(leaderboard);
});

// Get claim history
app.get("/api/history", async (req, res) => {
  const history = await ClaimHistory.find()
    .populate("userId", "name")
    .sort({ claimedAt: -1 });
  res.json(history);
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => console.log("Client disconnected"));
});

// Start server
// Ensure secure connection and production-ready settings
const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

// Configure security headers
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://leaderboard-systemkira.netlify.app",
    process.env.FRONTEND_URL || "https://leaderboard-systemkira.netlify.app",
    "http://localhost:3000",
  ];

  res.header("Access-Control-Allow-Origin", allowedOrigins.join(", "));
  res.header("X-Frame-Options", "DENY");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  res.header(
    "Content-Security-Policy",
    "default-src 'self' https: 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;"
  );

  if (isProduction && req.headers["x-forwarded-proto"] !== "https") {
    res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (isProduction) {
    console.log("Server is running in production mode");
  }
});
