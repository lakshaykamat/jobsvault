const { getDB, DATABASE } = require("../config/db");
const { createUser } = require("../models/user");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const sendEmail = require("../config/sendEmail");
const { getRegistrationEmailHtml } = require("../lib/utils");

const getUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .findOne(
        { id: userId },
        {
          projection: {
            _id: false,
            password: false,
            otp: false,
            otpExpires: false,
          },
        }
      );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.savedJobs || user.savedJobs.length === 0) {
      return res.status(200).json(user);
    }

    const savedJobs = await Promise.all(
      user.savedJobs.map(async (slug) => {
        return await getDB()
          .collection(DATABASE.JOB_PORTAL.COLLECTIONS.JOBS)
          .findOne({ slug }, { projection: { _id: 0 } });
      })
    );

    res.status(200).json({ ...user, savedJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const registerUser = async (req, res) => {
  try {
    // Create the user
    const { insertedId, acknowledged } = await createUser(req.body);

    const otp = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
    });
    const otpExpires = Date.now() + 3600000; // 1 hour from now

    await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .updateOne({ _id: insertedId }, { $set: { otp, otpExpires } });

    //Send Email
    await sendEmail(
      req.body.email,
      "Welcome to JobVault!",
      getRegistrationEmailHtml(req.body.name, otp)
    );

    res.status(201).json({ message: "OTP Sent to a registerd email" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .findOne({ email });
    if (!user)
      return res.status(400).json({ error: true, message: "Invalid email" });

    // Check if OTP is valid and not expired
    console.log(user.otp !== otp);
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid or expired OTP" });
    }

    // OTP is valid, proceed with the registration process
    await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .updateOne(
        { email },
        { $set: { otp: undefined, otpExpires: undefined } }
      );

    res.status(201).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ error: true, message: "Internal Server error" });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .findOne({ email });
    if (!user)
      return res.status(400).json({ error: true, message: "Invalid email" });

    // Generate a new OTP
    const otp = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
    });
    const otpExpires = Date.now() + 3600000; // 1 hour from now

    // OTP is valid, proceed with the registration process
    await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .updateOne({ email }, { $set: { otp, otpExpires } });

    // Send the new OTP email
    await sendEmail(
      req.body.email,
      "Your New OTP for Registration",
      getRegistrationEmailHtml(user.name, otp)
    );
    res.status(201).json({ message: `OTP sent to ${email}` });
  } catch (error) {
    res.status(500).send({ error: true, message: "Internal Server error" });
  }
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .findOne({ email }, { projection: { _id: false } });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ userId: user.id }, process.env.AUTH_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.status(200).json({ ...user, token });
    } else {
      res
        .status(401)
        .json({ error: true, message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const content = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ error: true, message: "User ID is required" });
    }

    await getDB().collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users).updateOne(
      { id: userId }, // Filter by userId
      { $set: content } // Update only the specified fields
    );

    res
      .status(200)
      .json({ error: false, message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

const viewSavedJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const jobs = [];
    const user = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .findOne({ id: userId });
    const savedJobs = await user.savedJobs;
    if (savedJobs.length > 0) {
      for (let slug of savedJobs) {
        const job = await getDB()
          .collection(DATABASE.JOB_PORTAL.COLLECTIONS.JOBS)
          .findOne({ slug });
        if (job) {
          jobs.push(job);
        }
      }

      res.status(200).json({ jobs });
    } else {
      res.status(200).json({ message: "0 jobs saved" });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: "Internal server error." });
  }
};

const saveJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.userId; // Assuming the user ID is set by the isAuthenticated middleware

    // Check if the job exists
    const isJobExist = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.JOBS)
      .findOne({ slug: jobId });

    if (!isJobExist) {
      return res.status(404).json({ message: "Job not found." });
    }

    // Update the user's saved jobs list
    const updateResult = await getDB()
      .collection(DATABASE.JOB_PORTAL.COLLECTIONS.Users)
      .updateOne(
        { id: userId },
        { $addToSet: { savedJobs: jobId } } // Using $addToSet to avoid duplicates
      );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ message: "Failed to save job." });
    }

    res.status(200).json({ message: "Job saved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: "Internal server error." });
  }
};

const contactUs = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if ((!name, !email, !message)) {
      res.status(500).json({ message: "Feilds are required" });
      return;
    }
    await getDB().collection("contacts").insertOne({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    sendEmail(email, "Your query was submitted", message);
    res.status(200).json({ message: "Message sent" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};
module.exports = {
  getUser,
  registerUser,
  loginUser,
  verifyOTP,
  saveJob,
  updateProfile,
  resendOTP,
  contactUs,
  viewSavedJobs,
};
