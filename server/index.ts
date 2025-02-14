const express = require('express');
const bcrypt = require('bcryptjs');
const joi = require('joi');
const app = express();
const port = 3000;
const cors = require('cors');

import { Request, Response } from 'express';

interface UserDto {
  username: string;
  email: string;
  type: 'user' | 'admin';
  password: string;
}

interface UserEntry {
  email: string;
  type: 'user' | 'admin';
  salt: string;
  passwordhash: string;
}

// Database mock where the username is the primary key of a user.
const MEMORY_DB: Record<string, UserEntry> = {
  "john_doe": {
    email: "john.doe@example.com",
    type: "user",
    salt: "a1b2c3d4e5",
    passwordhash: "5f4dcc3b5aa765d61d8327deb882cf99", // Example hash (not secure)
  },
  "admin_user": {
    email: "admin@example.com",
    type: "admin",
    salt: "f6g7h8i9j0",
    passwordhash: "e99a18c428cb38d5f260853678922e03", // Example hash
  },
};

// CODE HERE
//
// I want to be able to register a new unique user (username and password). After the user is created I
// should be able to login with my username and password. If a user register request is invalid a 400 error
// should be returned, if the user is already registered a conflict error should be returned.
// On login the users crendentials should be verified.
// Because we dont have a database in this environment we store the users in memory. Fill the helper functions
// to query the memory db.

app.use(cors());
app.use(express.json()); //middleware to parse json body

//Check for existing users via username. Return found user if existing, otherwise return undefined
function getUserByUsername(name: string): UserEntry {
  return MEMORY_DB[name];
}

//Find existing user in object via email address. Return found user if existing, otherwise return undefined
function getUserByEmail(email: string): UserEntry | undefined {
  return Object.values(MEMORY_DB).find((user) => user.email === email);
}

/**
 * Validation for user registration input
 */
const userSchema = joi.object({
  username: joi.string()
    .min(3)
    .max(24)
    .trim()
    .required()
    .regex(/^\S+$/) // Ensures no spaces-only values
    .messages({
      "string.empty": "Username is required",
      "string.min": "Username must be at least 3 characters long",
      "string.max": "Username cannot be more than 24 characters long",
      "string.pattern.base": "Username cannot contain spaces"
    }),
  email: joi.string()
    .email()
    .trim()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address"
    }),
  type: joi.string()
    .valid('user', 'admin')
    .required()
    .messages({
      "any.only": "Type must be either 'user' or 'admin'"
    }),
  password: joi.string()
    .min(5)
    .max(24)
    .trim()
    .required()
    .regex(/^\S+$/) // Ensures no spaces-only values
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\W).{5,24}$'))
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 5 characters long",
      "string.max": "Password cannot be more than 24 characters long",
      "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, and one special character, and cannot contain spaces"
    }),
});


// Request body -> UserDto
app.post('/register', async (req: Request, res: Response) => {
  // Validate user object using joi
  // - username (required, min 3, max 24 characters)
  // - email (required, valid email address)
  // - type (required, select dropdown with either 'user' or 'admin')
  // - password (required, min 5, max 24 characters, upper and lower case, at least one special character)
  const { error } = userSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const user: UserDto = req.body;

  if (getUserByUsername(user.username)) { //Return 409 error if existing user is found, do nothing if falsy
    return res.status(409).json({ error: 'Username is already taken' });
  }

  if (getUserByEmail(user.email)) { //Return 409 error if existing user is found, do nothing if falsy
    return res.status(409).json({ error: 'Email is alraedy Registered' });
  }

  //hashing the password before storing
  const salt = await bcrypt.genSalt(10);
  const passwordhash = await bcrypt.hash(user.password, salt);

  //Create new user object, use username as key in the object
  MEMORY_DB[user.username] = {
    email: user.email,
    type: user.type,
    salt,
    passwordhash,
  };

  //return success after operation
  return res.status(201).json({ message: 'User Registered Successfully! ' });
});

// Request body -> { username: string, password: string }
app.post('/login', async (req: Request, res: Response) => {
  // Return 200 if username and password match
  // Return 401 else

  const { username, password } = req.body;
  const user = getUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  //verify password
  const validPassword = await bcrypt.compare(password, user.passwordhash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid Username or Password' });
  }

  return res.status(200).json({ message: 'Login Successful' });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});