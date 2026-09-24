export {};

declare global {
  namespace Express {
    interface Request {
      // Được gắn bởi middleware authenticate
      user?: { id: string };
    }
  }
}
