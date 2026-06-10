import { http } from "./http";

export async function getMeApi() {
  const { data } = await http.get("/me");
  return data;
}

export async function getFeedFilterUsersApi() {
  const { data } = await http.get("/me/feed-filter-users");
  return data;
}