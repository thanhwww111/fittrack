import request from "supertest";
import app from "../../src/app";

let counter = 0;

// Tạo user mới và trả về access token + id để gọi các route cần đăng nhập
export async function createAuthedUser() {
  counter += 1;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: `User ${counter}`, email: `user${counter}@example.com`, password: "password123" });

  return {
    userId: res.body.data.user.id as string,
    token: res.body.data.accessToken as string,
    auth: { Authorization: `Bearer ${res.body.data.accessToken}` },
  };
}
