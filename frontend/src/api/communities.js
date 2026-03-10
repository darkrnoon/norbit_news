import { http } from "./http";

export async function listCommunities(params = {}) {
  const { data } = await http.get("/communities", { params });
  return data;
}

export async function listCommunityCategories() {
  const { data } = await http.get("/communities/categories");
  return data;
}

export async function getCommunityById(communityId) {
  const { data } = await http.get(`/communities/${communityId}`);
  return data;
}

export async function createCommunity(payload) {
  const { data } = await http.post("/communities", payload);
  return data;
}

export async function updateCommunity(communityId, payload) {
  const { data } = await http.patch(`/communities/${communityId}`, payload);
  return data;
}

export async function deleteCommunity(communityId) {
  const { data } = await http.delete(`/communities/${communityId}`);
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

export async function getMyCommunities() {
  const { data } = await http.get("/communities/my");
  return data;
}