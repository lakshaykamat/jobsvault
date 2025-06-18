require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const winston = require("winston");
const path = require("path");
const bodyParser = require("body-parser");
const { getDB, connectDB, DATABASE } = require("./config/db");

const app = express();

// Middleware setup
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://127.0.0.1:3000",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(bodyParser.json());
app.use(express.json());

// Set the view engine to EJS
app.set("view engine", "ejs");

// Set the views directory
app.set("views", path.join(__dirname, "views"));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, "public")));

// Example route
app.get("/", async (req, res) => {
  const jobs = await getDB()
    .collection(DATABASE.JOB_PORTAL.COLLECTIONS.JOBS)
    .find()
    .toArray();
  const indeedJobs = await jobs.filter((job) => job.source == "indeed.com");
  const linkedInJobs = await jobs.filter((job) => job.source == "linkedin.com");
  const naukriJobs = await jobs.filter((job) => job.source == "naukri.com");
  res.render("index", {
    title: "My Job Portal",
    jobsLength: jobs.length,
    indeedJobs,
    linkedInJobs,
    naukriJobs,
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.MAX_RATE_LIMIT_REQUEST || 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Routes setup
app.use("/api/v1/jobs", require("./routes/jobs"));
app.use("/api/v1/users", require("./routes/user"));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 8000;

async function runServer() {
  try {
    await connectDB(DATABASE.JOB_PORTAL.NAME);
    app.listen(PORT, () =>
      console.log(`Server running on port http://localhost:${PORT}/`)
    );
  } catch (error) {
    console.log(error);
  }
}
runServer();
