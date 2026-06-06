export function loadSession() {
  const token = localStorage.getItem("token") || "";
  const savedUser = localStorage.getItem("user");
  return {
    token,
    user: savedUser ? JSON.parse(savedUser) : null,
  };
}

export function saveSession(session) {
  localStorage.setItem("token", session.token);
  localStorage.setItem("user", JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
