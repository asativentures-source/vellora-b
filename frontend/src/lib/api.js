import axios from "axios";

function normalizeBackendUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return `http://${value.replace(/^\/+/, "")}`;
  }
  return `https://${value.replace(/^\/+/, "")}`;
}

const BACKEND_URL = normalizeBackendUrl(
  process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:8000"
      : "your-railway-backend.up.railway.app"),
);
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const fetchAdminContactMessages = (skip = 0, limit = 10, topic = "", search = "", startDate = "", endDate = "", status = "", followUpDate = "") => {
  let url = `/admin/contact-messages?skip=${skip}&limit=${limit}`;
  if (topic) url += `&topic=${topic}`;
  if (search) url += `&search=${search}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  if (status) url += `&status=${status}`;
  if (followUpDate) url += `&follow_up_date=${followUpDate}`;
  return api.get(url).then(r => r.data);
};

export const updateContactStatus = (phone, status, note = "", followUpDate = "") => 
  api.patch(`/admin/contact-messages/${phone}/status`, { 
    status, 
    note, 
    follow_up_date: followUpDate 
  }).then(r => r.data);
  
export const getMe = () => api.get("/auth/me").then(r => r.data);
export const logout = () => api.post("/auth/logout");
export const createSession = (session_id) => api.post("/auth/session", { session_id });
export const emailRegister = (data) => api.post("/auth/register", data).then(r => r.data);
export const emailLogin = (data) => api.post("/auth/login", data).then(r => r.data);
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email }).then(r => r.data);
export const resetPassword = (data) => api.post("/auth/reset-password", data).then(r => r.data);
export const addPassword = (password) => api.post("/auth/add-password", { password }).then(r => r.data);
export const changePassword = (data) => api.post("/auth/change-password", data).then(r => r.data);
export const fetchSecurity = () => api.get("/auth/security").then(r => r.data);
export const refreshTokens = () => api.post("/auth/refresh").then(r => r.data);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const fetchDoctors = () => api.get("/doctors").then(r => r.data);
export const fetchPrograms = () => api.get("/programs").then(r => r.data);
export const fetchPlans = () => api.get("/plans").then(r => r.data);
export const fetchTestimonials = () => api.get("/testimonials").then(r => r.data);
export const fetchBlog = (category) => api.get("/blog", { params: category ? { category } : {} }).then(r => r.data);
export const fetchFaqs = () => api.get("/faqs").then(r => r.data);
export const fetchStats = () => api.get("/platform-stats").then(r => r.data);

export const fetchPatientDashboard = () => api.get("/patient/dashboard").then(r => r.data);
export const addCheckin = (data) => api.post("/patient/checkin", data).then(r => r.data);
export const bookAppointment = (data) => api.post("/patient/appointment", data).then(r => r.data);
export const addGoal = (data) => api.post("/patient/goal", data).then(r => r.data);

export const fetchDoctorDashboard = () => api.get("/doctor/dashboard").then(r => r.data);
export const fetchAdminStats = () => api.get("/admin/stats").then(r => r.data);
export const fetchAdminUsers = () => api.get("/admin/users").then(r => r.data);
export const fetchAdminAppointments = () => api.get("/admin/appointments").then(r => r.data);

export const aiAssessment = (message, session_id) => api.post("/ai/assessment", { message, session_id }).then(r => r.data);
export const submitContact = (data) => api.post("/contact", data).then(r => r.data);
export const subscribeNewsletter = (email) => api.post("/newsletter", { email }).then(r => r.data);
