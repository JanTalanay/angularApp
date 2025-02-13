const express = require('express');
const bcrypt = require('bcryptjs');
const joi = require('joi');
const app = express();
const port = 3000;

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
const MEMORY_DB: Record<string, UserEntry> = {};

// CODE HERE
//
// I want to be able to register a new unique user (username and password). After the user is created I
// should be able to login with my username and password. If a user register request is invalid a 400 error
// should be returned, if the user is already registered a conflict error should be returned.
// On login the users crendentials should be verified.
// Because we dont have a database in this environment we store the users in memory. Fill the helper functions
// to query the memory db.

app.use(express.json()); //middleware to parse json body

function getUserByUsername(name: string): UserEntry | undefined {
  // TODO
  return MEMORY_DB[name];
}

function getUserByEmail(email: string): UserEntry | undefined {
  // TODO
  return Object.values(MEMORY_DB).find((user) => user.email === email);
}

/**
 * Validation for user registration input
 */
const userSchema = joi.object({
  username: joi.string().min(3).max(24).required(),
  email: joi.string().email().required(),
  type: joi.string().valid('user', 'admin').required(),
  password: joi
    .string()
    .min(5)
    .max(24)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*W).{5,24}$'))
    .required(),
});

// Request body -> UserDto
app.get('/register', async (req: Request, res: Response) => {
  // Validate user object using joi
  // - username (required, min 3, max 24 characters)
  // - email (required, valid email address)
  // - type (required, select dropdown with either 'user' or 'admin')
  // - password (required, min 5, max 24 characters, upper and lower case, at least one special character)
  const { error } = userSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const user: UserDto = req.body;

  if (getUserByUsername(user.username))
    return res.status(409).json({ error: 'Username is already taken' });
  if (getUserByEmail(user.email))
    return res.status(409).json({ error: 'Email is alraedy Registered' });

  //hashing the password before storing
  const salt = await bcrypt.genSalt(10);
  const passwordhash = await bcrypt.hash(user.password, salt);

  MEMORY_DB[user.username] = {
    email: user.email,
    type: user.type,
    salt,
    passwordhash,
  };

  res.status(201).json({ message: 'User Registered Successfully! ' });
});

// Request body -> { username: string, password: string }
app.post('/login', async (req: Request, res: Response) => {
  // Return 200 if username and password match
  // Return 401 else

  const { username, password } = req.body;
  const user = getUserByUsername(username);

  if (!user)
    return res.status(401).json({ error: 'Invalid username or password' });

  //verify password
  const validPassword = await bcrypt.compare(password, user.passwordhash);
  if (!validPassword)
    return res.status(401).json({ error: 'Invalid Username or Password' });

  res.status(200).json({ message: 'Login Successful' });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
