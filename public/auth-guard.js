function getSession() {
  try {
    return JSON.parse(localStorage.getItem("user_session"));
  } catch (e) {
    return null;
  }
}

function checkAuth(requiredRole) {
  const session = getSession();

  if (!session) {
    window.location.href = "/";
    return null;
  }

  if (requiredRole && session.role !== requiredRole) {
    alert("Bạn không có quyền truy cập vào trang này!");
    window.location.href = session.role === "teacher" ? "/teacher" : "/student";
    return null;
  }

  return session;
}

function logout() {
  localStorage.removeItem("user_session");
  window.location.href = "/";
}