// Lấy thông tin session: Nếu là teacher sẽ nằm ở localStorage, student nằm ở sessionStorage
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

// Lưu đồng bộ: Teacher giữ nguyên ở localStorage, Student thì ở sessionStorage
function saveSession(userData) {
  try {
    if (!userData) return;
    const str = JSON.stringify(userData);
    
    if (userData.role === "teacher") {
      localStorage.setItem("user_session", str);
    } else {
      sessionStorage.setItem("user_session", str);
    }
  } catch (e) {
    console.error("Lỗi lưu session:", e);
  }
}

// Kiểm tra quyền hạn của trang
function checkAuth(requiredRole) {
  const session = getSession();

  // 1. Chưa đăng nhập -> Chuyển hướng về trang chủ/đăng nhập
  if (!session || !session.role) {
    window.location.href = "/";
    return null;
  }

  // Đảm bảo đồng bộ lại vùng lưu trữ cho chắc chắn
  saveSession(session);

  // 2. Nếu trang yêu cầu quyền cụ thể và role không khớp:
  if (requiredRole && session.role !== requiredRole) {
    // Chuyển hướng người dùng về đúng trang thuộc quyền của họ
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

// Hàm đăng xuất: Xóa sạch toàn bộ session ở cả 2 kho lưu trữ và cache trên trình duyệt
function logout() {
  try {
    localStorage.removeItem("user_session");
    sessionStorage.removeItem("user_session");
    sessionStorage.removeItem("gacha_session_history");
    sessionStorage.removeItem("student_memes_cache");
    sessionStorage.removeItem("student_active_tab");
    sessionStorage.removeItem("teacher_active_tab");
    sessionStorage.removeItem("teacher_student_filter");
  } catch (e) {}

  window.location.href = "/";
}