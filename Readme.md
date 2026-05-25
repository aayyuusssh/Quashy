# Quashy

A scalable real-time quiz backend built with Node.js, Express, MongoDB, Redis, and Socket.io.

## Overview

`Quashy` provides a structured backend for multiplayer quizzes, featuring room management, authenticated socket connections, live gameplay, and persistent result tracking.

## Features

- Real-time multiplayer quiz rooms
- JWT-based user authentication
- Redis-powered Socket.io adapter for improved scalability
- MongoDB data models for users, rooms, questions, and game results
- Email support via SMTP
- Rate limiting and centralized error handling
- Cloudinary-ready file handling support

## Tech Stack

- Node.js
- Express
- MongoDB & Mongoose
- Redis
- Socket.io
- JSON Web Tokens (JWT)
- Nodemailer
- Cloudinary
- express-rate-limit

## Architecture

- `src/server.js` boots the app, connects to MongoDB and Redis, and initializes Socket.io.
- `src/app.js` configures Express middleware, route handlers, and error handling.
- `src/config/` contains environment-aware service setup for database, Redis, sockets, and email.
- `src/socket/` manages realtime socket event registration and authentication.
- `src/controllers/` implements REST actions for users, rooms, questions, and results.
- `src/models/` defines Mongoose schemas.
- `src/middlewares/` includes auth, rate limiting, file handling, and socket middleware.
- `src/runtime/` contains runtime helpers for room lifecycle and player state.

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file at the project root with the following values:

```env
PORT=
MONGODB_URI=
REDIS_URL=
CORS_ORIGIN=

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=

JWT_SECRET=
```

Add additional variables as needed for Cloudinary or custom deployment configuration.

## Running the App

```bash
npm run dev
```

The application starts from `src/server.js` and listens on the configured `PORT` 

## API Endpoints

Base path: `/api/v1`

- `POST /api/v1/users` — user authentication and profile actions
- `GET /api/v1/rooms` — room management
- `GET /api/v1/questions` — question management
- `GET /api/v1/room-questions` — room-specific quiz flows
- `GET /api/v1/game-results` — game result retrieval

## Socket Events

The backend supports realtime gameplay via Socket.io events:

- `join-room`
- `start-game`
- `submit-answer`
- `reconnect-player`

## Project Structure

```
src/
  server.js
  app.js
  config/
  controllers/
  middlewares/
  models/
  routes/
  socket/
  runtime/
```

## Notes

- The MongoDB database name is set in `src/constants/dbName.js`.
- Redis connection is configured in `src/config/redis.js`.
- Socket authentication is enforced in `src/config/socket.js` with middleware from `src/middlewares/socketAuth.middleware.js`.
- Error responses are standardized in `src/app.js`.

## Author

Ayush Gupta — passionate about building modern realtime applications and backend systems that scale.
