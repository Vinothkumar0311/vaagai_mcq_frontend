import axios from "axios";
import * as XLSX from "xlsx";
import { mockAuthApi, mockAdminApi, mockExaminerApi } from "./mockData";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://vaagai-mcq-backend.onrender.com";
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

// Setup axios instance
const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add Authorization header automatically
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mcq_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor to handle authentication failures (e.g. session invalid/user deleted)
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.status === 455 ||
        error.response.status === 403)
    ) {
      // Clear invalid credentials
      localStorage.removeItem("mcq_token");
      localStorage.removeItem("mcq_user");

      // Redirect to login page if not already there
      const currentPath = window.location.pathname;
      if (currentPath !== "/admin/login" && currentPath !== "/examiner/login") {
        const isAdminRoute = currentPath.startsWith("/admin");
        window.location.href = isAdminRoute
          ? "/admin/login"
          : "/examiner/login";
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  loginWithGoogle: async (token, mockUser = null) => {
    if (USE_MOCK_API) {
      const email = mockUser?.email || "examiner@vaagai.com";
      const name = mockUser?.name || "Jane Doe";
      return mockAuthApi.login(email, name);
    }
    const response = await apiInstance.post("/api/auth/google", {
      token,
      mockUser,
    });
    return response.data;
  },
  loginWithRegNo: async (regNo, extraDetails = {}) => {
    if (USE_MOCK_API) {
      return mockAuthApi.login("examiner@vaagai.com", "Jane Doe");
    }
    const response = await apiInstance.post("/api/auth/examiner-login", {
      regNo,
      ...extraDetails,
    });
    return response.data;
  },
  getProfile: async () => {
    if (USE_MOCK_API) {
      const stored = localStorage.getItem("mcq_user");
      return stored ? JSON.parse(stored) : null;
    }
    const response = await apiInstance.get("/api/auth/profile");
    return response.data;
  },
};

export const adminApi = {
  getStats: async () => {
    if (USE_MOCK_API) return mockAdminApi.getStats();
    const response = await apiInstance.get("/api/admin/stats");
    return response.data;
  },
  getTests: async () => {
    if (USE_MOCK_API) return mockAdminApi.getTests();
    const response = await apiInstance.get("/api/admin/tests");
    return response.data;
  },
  getTestDetails: async (id) => {
    if (USE_MOCK_API) {
      const tests = await mockAdminApi.getTests();
      const test = tests.find((t) => t.id === id);
      const questions = await mockAdminApi.getQuestions(id);
      return { ...test, questions, assignments: [] };
    }
    const response = await apiInstance.get(`/api/admin/test/${id}`);
    return response.data;
  },
  createTest: async (data) => {
    if (USE_MOCK_API) return mockAdminApi.createTest(data);
    const response = await apiInstance.post("/api/admin/test", data);
    return response.data;
  },
  updateTest: async (id, data) => {
    if (USE_MOCK_API) return mockAdminApi.updateTest(id, data);
    const response = await apiInstance.put(`/api/admin/test/${id}`, data);
    return response.data;
  },
  deleteTest: async (id) => {
    if (USE_MOCK_API) return mockAdminApi.deleteTest(id);
    const response = await apiInstance.delete(`/api/admin/test/${id}`);
    return response.data;
  },
  uploadQuestions: async (testId, file, imageFiles = []) => {
    if (USE_MOCK_API) {
      // In mock mode, parse the file client-side using the xlsx library
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);

            const questions = rows.map((row) => {
              let question = "";
              let optionA = "";
              let optionB = "";
              let optionC = "";
              let optionD = "";
              let correctAnswer = "";
              let imageUrl = null;

              Object.keys(row).forEach((key) => {
                const cleanKey = key.trim().toLowerCase();
                const val = String(row[key]).trim();

                if (cleanKey === "question") question = val;
                else if (
                  cleanKey === "option a" ||
                  cleanKey === "optiona" ||
                  cleanKey === "a"
                )
                  optionA = val;
                else if (
                  cleanKey === "option b" ||
                  cleanKey === "optionb" ||
                  cleanKey === "b"
                )
                  optionB = val;
                else if (
                  cleanKey === "option c" ||
                  cleanKey === "optionc" ||
                  cleanKey === "c"
                )
                  optionC = val;
                else if (
                  cleanKey === "option d" ||
                  cleanKey === "optiond" ||
                  cleanKey === "d"
                )
                  optionD = val;
                else if (
                  cleanKey === "correct answer" ||
                  cleanKey === "correctanswer" ||
                  cleanKey === "correct"
                )
                  correctAnswer = val.toUpperCase();
                else if (
                  [
                    "image",
                    "image url",
                    "imageurl",
                    "image_url",
                    "image file",
                  ].includes(cleanKey)
                )
                  imageUrl = val;
              });

              return {
                question,
                optionA,
                optionB,
                optionC,
                optionD,
                correctAnswer,
                imageUrl,
              };
            });

            const result = await mockAdminApi.uploadQuestions(
              testId,
              questions,
            );
            resolve(result);
          } catch (err) {
            reject(
              new Error("Failed to parse Excel file on client: " + err.message),
            );
          }
        };
        reader.onerror = () => reject(new Error("File reading error."));
        reader.readAsArrayBuffer(file);
      });
    }

    const formData = new FormData();
    formData.append("file", file);
    // Attach optional separate image files (field: images[])
    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((imgFile) => {
        formData.append("images", imgFile);
      });
    }
    const response = await apiInstance.post(
      "/api/admin/upload-questions",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  getResults: async (search = "", testId = "", page = 1, limit = 10) => {
    if (USE_MOCK_API)
      return mockAdminApi.getResults(search, testId, page, limit);
    const response = await apiInstance.get("/api/admin/results", {
      params: { search, testId, page, limit },
    });
    return response.data;
  },
  exportResultsUrl: (testId = "") => {
    if (USE_MOCK_API) return null;
    return `${API_BASE_URL}/api/admin/export-results?testId=${testId}&token=${localStorage.getItem("mcq_token")}`;
  },
  // ── Single-question manual CRUD (Global Question Bank) ───────────────────
  addQuestion: async (fields, imageFile = null) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.append(k, v);
    });
    if (imageFile) formData.append("image", imageFile);
    const response = await apiInstance.post("/api/admin/question", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  updateQuestion: async (id, fields, imageFile = null) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    if (imageFile) formData.append("image", imageFile);
    const response = await apiInstance.put(
      `/api/admin/question/${id}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  deleteQuestion: async (id) => {
    const response = await apiInstance.delete(`/api/admin/question/${id}`);
    return response.data;
  },
  deleteDuplicateQuestions: async () => {
    const response = await apiInstance.delete(
      "/api/admin/questions/duplicates",
    );
    return response.data;
  },
  // ── Examiner Registrations (CRUD & Import) ──────────────────────────────
  getRegistrations: async (
    search = "",
    className = "",
    page = 1,
    limit = 10,
  ) => {
    const response = await apiInstance.get("/api/admin/registrations", {
      params: { search, class: className, page, limit },
    });
    return response.data;
  },
  getQuestions: async (page = 1, limit = 20, search = "", className = "") => {
    const response = await apiInstance.get("/api/admin/questions", {
      params: { page, limit, search, class: className },
    });
    return response.data;
  },
  getDistinctClasses: async () => {
    const response = await apiInstance.get("/api/admin/registrations/classes");
    return response.data;
  },
  addRegistration: async (data) => {
    const response = await apiInstance.post("/api/admin/registrations", data);
    return response.data;
  },
  updateRegistration: async (refNo, data) => {
    const response = await apiInstance.put(
      `/api/admin/registrations/${refNo}`,
      data,
    );
    return response.data;
  },
  deleteRegistration: async (refNo) => {
    const response = await apiInstance.delete(
      `/api/admin/registrations/${refNo}`,
    );
    return response.data;
  },
  importRegistrations: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiInstance.post(
      "/api/admin/registrations/import",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
};

export const examinerApi = {
  getTests: async (email) => {
    if (USE_MOCK_API) return mockExaminerApi.getTests(email);
    const response = await apiInstance.get("/api/examiner/tests");
    return response.data;
  },
  getTestQuestions: async (testId, email) => {
    if (USE_MOCK_API) return mockExaminerApi.getTestQuestions(testId, email);
    const response = await apiInstance.get(`/api/examiner/test/${testId}`);
    return response.data;
  },
  submitTest: async (
    testId,
    answers,
    timeTaken,
    email,
    forceZeroScore = false,
  ) => {
    if (USE_MOCK_API)
      return mockExaminerApi.submitTest(
        testId,
        answers,
        timeTaken,
        email,
        forceZeroScore,
      );
    const response = await apiInstance.post("/api/examiner/submit", {
      testId,
      answers,
      timeTaken,
      forceZeroScore,
    });
    return response.data;
  },
  getResultDetails: async (resultId, email) => {
    if (USE_MOCK_API) return mockExaminerApi.getResultDetails(resultId, email);
    const response = await apiInstance.get(`/api/examiner/result/${resultId}`);
    return response.data;
  },
};

// Public API — no authentication required, for shareable test URLs
export const publicApi = {
  getTestInfo: async (testId) => {
    const response = await apiInstance.get(`/api/public/test/${testId}`);
    return response.data;
  },
  getTestQuestions: async (testId, sessionId, name) => {
    const response = await apiInstance.get(`/api/public/test/${testId}/questions`, {
      params: { sessionId, name },
    });
    return response.data;
  },
  submitTest: async (testId, sessionId, name, answers, timeTaken, forceZeroScore = false) => {
    const response = await apiInstance.post('/api/public/submit', {
      testId,
      sessionId,
      name,
      answers,
      timeTaken,
      forceZeroScore,
    });
    return response.data;
  },
};
