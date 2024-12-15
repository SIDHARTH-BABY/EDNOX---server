import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { otpSend } from "../Services/nodeMailer.js";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const emailExist = await User.findOne({ email: email });

    if (emailExist) {
      res.status(200).send({
        message: "Email already exist",
        success: false,
      });
    } else {
      otpSend(email)
        .then((response) => {
          res.status(200).send({
            message: "OTP sent",
            response: response,
            success: true,
          });
        })
        .catch((err) => console.log("ERROR", err));
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false });
  }
};

//REGISTER USER

export const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      picturePath,
      friends,
      location,
      occupation,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({success: false, error: "All required fields must be provided" });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({success: false, error: "Email already exists. Please use a different email." });
    }

    // Generate salt and hash the password
    const salt = await bcrypt.genSalt();
    console.log("Generated salt:", salt); // Debugging
    const passwordHash = await bcrypt.hash(password, salt);
    console.log("Password hash:", passwordHash); // Debugging

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
      picturePath,
      friends,
      location,
      occupation,
      viewedProfile: Math.floor(Math.random() * 10000),
      impressions: Math.floor(Math.random() * 10000),
    });

    const savedUser = await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET);

    // Retrieve saved user
    const user = await User.findOne({ email });

    // Return success response
    res.status(201).json({ savedUser, token, user, success: true });
  } catch (err) {
    console.error("Error during registration:", err.message); // Log error details
    if (err.code === 11000) {
      return res.status(400).json({success: false, error: "Email already exists." });
    }
    res.status(500).json({ error: "An unexpected error occurred." });
  }
};



//login

export const login = async (req, res) => {
  try {
    console.log(req.body, "nowwwwwww");
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });

    if (!user) return res.status(400).json({ msg: " User does not exist" });

    if (user.Active) {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch)
        return res
          .status(400)
          .json({ msg: "Invalid Credentials", success: false });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      delete user.password;
      res.status(200).json({ token, user, success: true });
    } else {
      res.status(401).json({ status: "user have been blocked" });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
};

