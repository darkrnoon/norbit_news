import { http } from "./http";

export async function getCommunityCategories() {
  const { data } = await http.get("/communities/categories");
  return data;
}

export async function listCommunities(params = {}) {
  const { data } = await http.get("/communities", { params });
  return data;
}

export async function getMyCommunities() {
  const { data } = await http.get("/communities/my");
  return data;
}

export async function getCommunityById(communityId) {
  const { data } = await http.get(`/communities/${communityId}`);
  return data;
}

export async function createCommunity(formData) {
  const { data } = await http.post("/communities", formData);
  return data;
}

export async function updateCommunity(communityId, formData) {
  const { data } = await http.patch(`/communities/${communityId}`, formData);
  return data;
}

export async function subscribeCommunity(communityId) {
  const { data } = await http.post(`/communities/${communityId}/subscribe`);
  return data;
}

export async function unsubscribeCommunity(communityId) {
  const { data } = await http.delete(`/communities/${communityId}/subscribe`);
  return data;
}

export async function deleteCommunity(communityId) {
  const { data } = await http.delete(`/communities/${communityId}`);
  return data;
}

export async function getCommunityPosts(communityId) {
  const { data } = await http.get(`/communities/${communityId}/posts`);
  return data;
}