// Local, backend-free replacement for the Base44 auth SDK.
// Stores users and session in localStorage. API-compatible with the
// subset of `base44.auth.*` methods this app calls, so it can be
// swapped in as a drop-in import alias.

const USERS_KEY = "amul_auth_users";
const SESSION_KEY = "amul_auth_session";

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const localAuth = {
  auth: {
  async register({ email, password }) {
    const users = loadUsers();
    if (users.find((u) => u.email === email)) {
      throw { status: 400, message: "Email already registered" };
    }
    users.push({ id: "u_" + Date.now(), email, password });
    saveUsers(users);
    return { success: true };
  },

  async verifyOtp({ email }) {
    // No real OTP flow in local mode — auto-confirm immediately.
    return { access_token: "local_" + btoa(email) };
  },

  async resendOtp() {
    return { success: true };
  },

  async loginViaEmailPassword(email, password) {
    const users = loadUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      throw { status: 401, message: "Invalid email or password" };
    }
    const token = "local_" + btoa(email);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, id: user.id }));
    localStorage.setItem("amul_token", token);
    return { access_token: token };
  },

  loginWithProvider() {
    throw { status: 400, message: "Social login is not available in local mode" };
  },

  async me() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!session) {
      throw { status: 401, message: "Not authenticated" };
    }
    return session;
  },

  setToken(token) {
    localStorage.setItem("amul_token", token);
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("amul_token");
  },

  redirectToLogin() {
    window.location.href = "/login";
  },

  async resetPasswordRequest() {
    return { success: true };
  },

  async resetPassword() {
    return { success: true };
  },
  },
};
