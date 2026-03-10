import { http } from "./http";

export async function loginApi(login, password) {
  const { data } = await http.post("/auth/login", { login, password });
  return data; // { accessToken }
}