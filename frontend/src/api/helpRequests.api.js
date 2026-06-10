import { http } from "./http";

export async function getHelpRequests() {
  const { data } = await http.get("/help-requests");
  return data;
}

export async function getMyHelpRequests() {
  const { data } = await http.get("/help-requests/my");
  return data;
}

export async function getMyHelpResponses() {
  const { data } = await http.get("/help-requests/responses/my");
  return data;
}

export async function getHelpRequestById(requestId) {
  const { data } = await http.get(`/help-requests/${requestId}`);
  return data;
}

export async function createHelpRequest(payload) {
  const { data } = await http.post("/help-requests", payload);
  return data;
}

export async function updateHelpRequest(requestId, payload) {
  const { data } = await http.patch(`/help-requests/${requestId}`, payload);
  return data;
}

export async function deleteHelpRequest(requestId) {
  const { data } = await http.delete(`/help-requests/${requestId}`);
  return data;
}

export async function respondHelpRequest(requestId) {
  const { data } = await http.post(`/help-requests/${requestId}/respond`);
  return data;
}

export async function cancelHelpResponse(requestId) {
  const { data } = await http.delete(`/help-requests/${requestId}/respond`);
  return data;
}

export async function confirmHelpResponse(requestId, responseId) {
  const { data } = await http.post(
    `/help-requests/${requestId}/responses/${responseId}/confirm`
  );

  return data;
}