function getSession() {
  try {
    const localData = localStorage.getItem("user_session");
    if (localData) return JSON.parse(localData);

    const sessionData = sessionStorage.getItem("user_session");
    if (sessionData) return JSON.parse(sessionData);

    return null;
  } catch (e) {
    return null;
  }
}

function saveSession(userData) {
  try {
    if (!userData) return;
    const sessionValue = JSON.stringify(userData);

    if (userData.role === "teacher") {
      localStorage.setItem("user_session", sessionValue);
    } else {
      sessionStorage.setItem("user_session", sessionValue);
    }
  } catch (e) {
    console.error("Lỗi lưu session:", e);
  }
}

function checkAuth(requiredRole) {
  const session = getSession();

  if (!session || !session.role) {
    window.location.href = "/";
    return null;
  }

  saveSession(session);

  if (requiredRole && session.role !== requiredRole) {
    if (session.role === "teacher") {
      window.location.href = "/teacher";
    } else if (session.role === "student") {
      window.location.href = "/student";
    } else {
      window.location.href = "/";
    }
    return null;
  }

  return session;
}

function logout() {
  try {
    localStorage.removeItem("user_session");
    sessionStorage.removeItem("user_session");
    localStorage.removeItem("admin_quick_login_backup");
    sessionStorage.removeItem("admin_quick_login_backup");
    [
      "gacha_session_history",
      "student_memes_cache",
      "student_active_tab",
      "teacher_active_tab",
      "teacher_student_filter"
    ].forEach(key => sessionStorage.removeItem(key));
  } catch (e) {}

  window.location.href = "/";
}

function returnToAdmin() {
  try {
    const backupRaw = sessionStorage.getItem("admin_quick_login_backup") || localStorage.getItem("admin_quick_login_backup");
    if (!backupRaw) {
      window.location.href = "/teacher";
      return;
    }

    const backup = JSON.parse(backupRaw);
    if (!backup || !backup.role || backup.role !== "teacher") {
      window.location.href = "/teacher";
      return;
    }

    sessionStorage.removeItem("user_session");
    sessionStorage.removeItem("current_user");
    localStorage.setItem("user_session", JSON.stringify(backup));
    localStorage.removeItem("admin_quick_login_backup");
    sessionStorage.removeItem("admin_quick_login_backup");
    window.location.href = "/teacher";
  } catch (e) {
    window.location.href = "/teacher";
  }
}