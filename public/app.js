// Khởi tạo các phần tử DOM chính
const loginForm = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const loginSection = document.getElementById("login-section");
const teacherDashboard = document.getElementById("teacher-dashboard");
const studentDashboard = document.getElementById("student-dashboard");

const schoolSelect = document.getElementById("school-select");
const newSchoolInput = document.getElementById("new-school-input");
const createStudentForm = document.getElementById("create-student-form");
const createStatus = document.getElementById("create-status");
const viewTitle = document.getElementById("view-title");

let questionsData = [];

const TAB_TITLES = {
  "tab-school-manage": "Quản Lý Trường Học",
  "tab-student-manage": "Quản Lý Học Sinh",
  "tab-exam": "Quản Lý Đề Thi",
  "tab-grading": "Bảng Điểm & Thống Kê",
  "tab-collection": "Quản Lý Phần Thưởng",
  "tab-settings": "Cài Đặt Hệ Thống"
};

// 1. Kiểm tra phiên đăng nhập khi tải trang
window.addEventListener("DOMContentLoaded", () => {
  const session = getUserSession();
  if (session) {
    showDashboard(session);
  }
});

function getUserSession() {
  try {
    return JSON.parse(localStorage.getItem("user_session") || sessionStorage.getItem("current_user") || "null");
  } catch (e) {
    return null;
  }
}

// 2. Xử lý Đăng nhập
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorMsg) errorMsg.textContent = "";

    const username = document.getElementById("username")?.value.trim() || "";
    const password = document.getElementById("password")?.value.trim() || "";

    if (!username || !password) {
      if (errorMsg) errorMsg.textContent = "Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!";
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        if (errorMsg) errorMsg.textContent = result.message || "Đăng nhập thất bại.";
        return;
      }

      // Lưu đồng bộ dữ liệu phiên cho auth-guard
      localStorage.setItem("user_session", JSON.stringify(result.data));
      sessionStorage.setItem("current_user", JSON.stringify(result.data));

      showDashboard(result.data);

    } catch (err) {
      if (errorMsg) errorMsg.textContent = "Không thể kết nối đến máy chủ xác thực.";
    }
  });
}

function showDashboard(user) {
  if (loginSection) loginSection.classList.add("hidden");

  if (user.role === "teacher") {
    if (teacherDashboard) teacherDashboard.classList.remove("hidden");
    const teacherNameEl = document.getElementById("teacher-name");
    if (teacherNameEl) teacherNameEl.textContent = user.fullName || user.username;
    loadSchools();
  } else if (user.role === "student") {
    if (studentDashboard) studentDashboard.classList.remove("hidden");
    const stuName = document.getElementById("student-name");
    const stuClass = document.getElementById("student-class");
    const stuSchool = document.getElementById("student-school");

    if (stuName) stuName.textContent = user.fullName || "---";
    if (stuClass) stuClass.textContent = user.className || "---";
    if (stuSchool) stuSchool.textContent = user.school || "---";
  }
}

// 3. Chuyển đổi Tab Menu
function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

  const activePanel = document.getElementById(tabId);
  if (activePanel) activePanel.classList.add("active");

  const clickedBtn = Array.from(document.querySelectorAll(".nav-item")).find(btn => 
    btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(tabId)
  );
  if (clickedBtn) clickedBtn.classList.add("active");

  if (viewTitle && TAB_TITLES[tabId]) {
    viewTitle.textContent = TAB_TITLES[tabId];
  }
}

function actionPlaceholder(featureName) {
  alert(`Chức năng "${featureName}" đang được chuẩn bị.`);
}

// 4. Quản lý danh sách trường học (Đồng bộ với Supabase API)
async function loadSchools() {
  if (!schoolSelect) return;
  schoolSelect.innerHTML = '<option value="">-- Đang tải danh sách... --</option>';

  try {
    const res = await fetch("/.netlify/functions/auth");
    const result = await res.json();

    if (result.success && result.data.schools) {
      schoolSelect.innerHTML = '<option value="" disabled selected hidden>-- Chọn trường học --</option>';
      
      result.data.schools.forEach(schoolItem => {
        const schoolName = typeof schoolItem === "object" ? schoolItem.name : schoolItem;
        const isHidden = typeof schoolItem === "object" && schoolItem.is_hidden;

        const opt = document.createElement("option");
        opt.value = schoolName;
        opt.textContent = schoolName + (isHidden ? " 🚫 (Ẩn)" : "");
        schoolSelect.appendChild(opt);
      });

      const newOpt = document.createElement("option");
      newOpt.value = "__ADD_NEW__";
      newOpt.textContent = "+ Thêm trường mới...";
      schoolSelect.appendChild(newOpt);
    }
  } catch (err) {
    schoolSelect.innerHTML = '<option value="">Lỗi tải danh sách trường</option>';
  }
}

function toggleNewSchoolInput() {
  if (!schoolSelect || !newSchoolInput) return;
  if (schoolSelect.value === "__ADD_NEW__") {
    newSchoolInput.classList.remove("hidden");
    newSchoolInput.required = true;
    newSchoolInput.focus();
  } else {
    newSchoolInput.classList.add("hidden");
    newSchoolInput.required = false;
  }
}

// 5. Tạo tài khoản học sinh mới
if (createStudentForm) {
  createStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (createStatus) {
      createStatus.className = "status-msg";
      createStatus.textContent = "Đang tạo tài khoản học sinh...";
    }

    let school = schoolSelect ? schoolSelect.value : "";
    if (school === "__ADD_NEW__" && newSchoolInput) {
      school = newSchoolInput.value.trim();
    }

    if (!school) {
      if (createStatus) {
        createStatus.className = "status-msg status-error";
        createStatus.textContent = "Vui lòng chọn hoặc nhập tên trường!";
      }
      return;
    }

    // Tự động phân tách Họ và Tên nếu form dùng trường FullName
    const rawFullName = document.getElementById("stu-fullname")?.value.trim() || "";
    let lastName = document.getElementById("stu-lastname")?.value.trim();
    let firstName = document.getElementById("stu-firstname")?.value.trim();

    if (!lastName && !firstName && rawFullName) {
      const parts = rawFullName.split(/\s+/);
      firstName = parts.pop() || "";
      lastName = parts.join(" ") || "";
    }

    const payload = {
      action: "create_student",
      school: school,
      lastName: lastName || "",
      firstName: firstName || "",
      className: document.getElementById("stu-class")?.value.trim().toUpperCase() || "",
      username: document.getElementById("stu-username")?.value.trim() || "",
      password: document.getElementById("stu-password")?.value.trim() || ""
    };

    try {
      const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        if (createStatus) {
          createStatus.className = "status-msg status-error";
          createStatus.textContent = result.message || "Tạo tài khoản thất bại!";
        }
        return;
      }

      if (createStatus) {
        createStatus.className = "status-msg status-success";
        createStatus.textContent = result.message || `Tạo thành công: ${result.data?.fullName || 'học sinh mới'}!`;
      }

      createStudentForm.reset();
      if (newSchoolInput) newSchoolInput.classList.add("hidden");
      loadSchools();

    } catch (err) {
      if (createStatus) {
        createStatus.className = "status-msg status-error";
        createStatus.textContent = "Lỗi kết nối khi gửi dữ liệu!";
      }
    }
  });
}

// 6. Xử lý làm bài thi trắc nghiệm
async function startQuiz() {
  try {
    const res = await fetch("/questions.json");
    questionsData = await res.json();

    renderQuestions();
    const intro = document.getElementById("quiz-intro");
    const screen = document.getElementById("quiz-screen");
    const result = document.getElementById("quiz-result");

    if (intro) intro.classList.add("hidden");
    if (screen) screen.classList.remove("hidden");
    if (result) result.classList.add("hidden");
  } catch (err) {
    alert("Không thể tải bộ câu hỏi: " + err.message);
  }
}

function renderQuestions() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  container.innerHTML = "";

  questionsData.forEach((q, qIndex) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question-item";

    let optionsHtml = "";
    q.options.forEach((opt, optIndex) => {
      optionsHtml += `
        <label class="option-item" style="display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer;">
          <input type="radio" name="question_${qIndex}" value="${optIndex}">
          <span>${opt}</span>
        </label>
      `;
    });

    qDiv.innerHTML = `
      <div class="question-text" style="font-weight:600; margin-bottom:8px;">Câu ${qIndex + 1}: ${q.question}</div>
      <div class="options-group">${optionsHtml}</div>
    `;
    container.appendChild(qDiv);
  });
}

async function submitQuiz() {
  let correctCount = 0;
  let unAnswered = false;

  questionsData.forEach((q, qIndex) => {
    const selected = document.querySelector(`input[name="question_${qIndex}"]:checked`);
    if (!selected) {
      unAnswered = true;
    } else if (parseInt(selected.value, 10) === q.answer) {
      correctCount++;
    }
  });

  if (unAnswered && !confirm("Bạn chưa hoàn thành hết tất cả câu hỏi. Vẫn muốn nộp bài?")) {
    return;
  }

  const finalScore = ((correctCount / questionsData.length) * 10).toFixed(1);

  const screen = document.getElementById("quiz-screen");
  const result = document.getElementById("quiz-result");
  const scoreText = document.getElementById("score-text");

  if (screen) screen.classList.add("hidden");
  if (result) result.classList.remove("hidden");
  if (scoreText) scoreText.textContent = `${finalScore} / 10 Điểm`;

  const session = getUserSession();
  const saveStatus = document.getElementById("save-status");
  if (!session || !session.id) return;

  if (saveStatus) {
    saveStatus.className = "status-msg";
    saveStatus.textContent = "Đang đồng bộ kết quả lên hệ thống...";
  }

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_score",
        id: session.id,
        scoreColumn: 1,
        score: finalScore
      })
    });
    const resData = await res.json();
    if (resData.success) {
      if (saveStatus) {
        saveStatus.className = "status-msg status-success";
        saveStatus.textContent = "Điểm số đã được tự động cập nhật vào hệ thống!";
      }
    } else if (saveStatus) {
      saveStatus.className = "status-msg status-error";
      saveStatus.textContent = "Lưu điểm thất bại: " + (resData.message || "");
    }
  } catch (err) {
    if (saveStatus) {
      saveStatus.className = "status-msg status-error";
      saveStatus.textContent = "Không thể gửi dữ liệu điểm về máy chủ.";
    }
  }
}

function restartQuiz() {
  const result = document.getElementById("quiz-result");
  const intro = document.getElementById("quiz-intro");
  if (result) result.classList.add("hidden");
  if (intro) intro.classList.remove("hidden");
}

// 7. Đăng xuất hoàn chỉnh (Xóa session và dọn sạch lịch sử gacha)
function logout() {
  localStorage.removeItem("user_session");
  sessionStorage.removeItem("current_user");
  sessionStorage.removeItem("gacha_session_history");
  sessionStorage.removeItem("teacher_active_tab");
  sessionStorage.removeItem("student_active_tab");
  sessionStorage.removeItem("teacher_student_filter");
  window.location.reload();
}