import { http } from "./http";

export async function getMe() {
  const { data } = await http.get("/me");
  return data;
}