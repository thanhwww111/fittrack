# FitTrack

Personal Fitness & Nutrition Tracker

## Core Features

- Authentication
- Nutrition Tracking
- Workout Tracking
- Body Progress
- Personal Records
- Dashboard

## Tech Stack

- **Mobile:** React Native, Expo, TypeScript, Expo Router, Zustand
- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, Zod
- **Auth:** JWT access token + rotating refresh token

## Project Structure

```
fittrack/
├── mobile/   # Expo app
├── server/   # Express REST API
└── docs/     # Coding plan & notes
```

## Getting Started

### Server

```bash
cd server
cp .env.example .env   # điền MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run dev            # http://localhost:4000/api/health
```

### Mobile

```bash
cd mobile
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://<LAN_IP>:4000/api
npm install
npx expo start
```

## Roadmap

Xem [docs/CODING_PLAN.md](docs/CODING_PLAN.md).

## Deploy

MongoDB Atlas + Render (API) + EAS (app Android). Hướng dẫn từng bước: [docs/DEPLOY.md](docs/DEPLOY.md).
