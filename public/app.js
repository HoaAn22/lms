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
  "tab-create-user": "Tạo Tài Khoản Học Sinh",
  "tab-student-list": "Danh Sách Học Sinh",
  "tab-exam": "Ngân Hàng Đề Thi & Trắc Nghiệm",
  "tab-grading": "Bảng Điểm & Thống Kê",
  "tab-assignment": "Giao Bài Tập Về Nhà",
  "tab-settings": "Cài Đặt Hệ Thống"
};

// 1. Kiểm tra session khi tải trang
window.addEventListener("DOMContentLoaded", () => {
  const session = JSON.parse(localStorage.getItem("user_session"));
  if (session) {
    showDashboard(session);
  }
});

// 2. Xử lý Đăng nhập
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.message || "Đăng nhập thất bại.";
      return;
    }

    localStorage.setItem("user_session", JSON.stringify(data));
    showDashboard(data);

  } catch (err) {
    errorMsg.textContent = "Không thể kết nối đến máy chủ Netlify.";
  }
});

function showDashboard(user) {
  loginSection.classList.add("hidden");

  if (user.role === "teacher") {
    teacherDashboard.classList.remove("hidden");
    document.getElementById("teacher-name").textContent = user.fullName || user.username;
    loadSchools();
  } else if (user.role === "student") {
    studentDashboard.classList.remove("hidden");
    document.getElementById("student-name").textContent = user.fullName;
    document.getElementById("student-class").textContent = user.className;
    document.getElementById("student-school").textContent = user.school;
  }
}

// 3. Tab Switching
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

// 4. Quản lý danh sách trường
async function loadSchools() {
  schoolSelect.innerHTML = '<option value="">-- Đang tải danh sách... --</option>';
  try {
    const res = await fetch("/.netlify/functions/auth");
    const result = await res.json();

    if (result.success && result.data.schools) {
      schoolSelect.innerHTML = '<option value="">-- Chọn trường học --</option>';
      result.data.schools.forEach(school => {
        const opt = document.createElement("option");
        opt.value = school;
        opt.textContent = school;
        schoolSelect.appendChild(opt);
      });
      const newOpt = document.createElement("option");
      newOpt.value = "__ADD_NEW__";
      newOpt.textContent = "+ Thêm trường mới (Tạo tab mới)...";
      schoolSelect.appendChild(newOpt);
    }
  } catch (err) {
    schoolSelect.innerHTML = '<option value="">Lỗi tải danh sách trường</option>';
  }
}

function toggleNewSchoolInput() {
  if (schoolSelect.value === "__ADD_NEW__") {
    newSchoolInput.classList.remove("hidden");
    newSchoolInput.required = true;
    newSchoolInput.focus();
  } else {
    newSchoolInput.classList.add("hidden");
    newSchoolInput.required = false;
  }
}

// 5. Tạo học sinh mới
createStudentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  createStatus.className = "status-msg";
  createStatus.textContent = "Đang kết nối Google Sheets...";

  let school = schoolSelect.value;
  if (school === "__ADD_NEW__") {
    school = newSchoolInput.value.trim();
  }

  if (!school) {
    createStatus.className = "status-msg status-error";
    createStatus.textContent = "Vui lòng chọn hoặc nhập tên trường!";
    return;
  }

  const payload = {
    action: "create_student",
    school: school,
    fullName: document.getElementById("stu-fullname").value.trim(),
    className: document.getElementById("stu-class").value.trim(),
    username: document.getElementById("stu-username").value.trim(),
    password: document.getElementById("stu-password").value.trim()
  };

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      createStatus.className = "status-msg status-error";
      createStatus.textContent = result.message || "Tạo tài khoản thất bại!";
      return;
    }

    createStatus.className = "status-msg status-success";
    createStatus.textContent = `Tạo thành công: ${result.data.fullName} (Mã: ${result.data.id}) tại ${result.data.school}!`;

    createStudentForm.reset();
    newSchoolInput.classList.add("hidden");
    loadSchools();

  } catch (err) {
    createStatus.className = "status-msg status-error";
    createStatus.textContent = "Lỗi kết nối khi tạo tài khoản!";
  }
});

// 6. Xử lý làm bài thi của Học Sinh
async function startQuiz() {
  try {
    const res = await fetch("/questions.json");
    questionsData = await res.json();

    renderQuestions();
    document.getElementById("quiz-intro").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");
    document.getElementById("quiz-result").classList.add("hidden");
  } catch (err) {
    alert("Không thể tải bộ câu hỏi: " + err.message);
  }
}

function renderQuestions() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  questionsData.forEach((q, qIndex) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question-item";

    let optionsHtml = "";
    q.options.forEach((opt, optIndex) => {
      optionsHtml += `
        <label class="option-item">
          <input type="radio" name="question_${qIndex}" value="${optIndex}">
          <span>${opt}</span>
        </label>
      `;
    });

    qDiv.innerHTML = `
      <div class="question-text">Câu ${qIndex + 1}: ${q.question}</div>
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
    } else if (parseInt(selected.value) === q.answer) {
      correctCount++;
    }
  });

  if (unAnswered && !confirm("Bạn chưa hoàn thành hết tất cả câu hỏi. Vẫn muốn nộp bài?")) {
    return;
  }

  const finalScore = ((correctCount / questionsData.length) * 10).toFixed(1);

  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("quiz-result").classList.remove("hidden");
  document.getElementById("score-text").textContent = `${finalScore} / 10 Điểm`;

  const session = JSON.parse(localStorage.getItem("user_session"));
  const saveStatus = document.getElementById("save-status");
  saveStatus.className = "status-msg";
  saveStatus.textContent = "Đang đồng bộ kết quả lên Google Sheets...";

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_score",
        school: session.school,
        id: session.id,
        scoreColumn: 1, // Điền vào Điểm 1
        score: finalScore
      })
    });
    const result = await res.json();
    if (result.success) {
      saveStatus.className = "status-msg status-success";
      saveStatus.textContent = "Điểm số đã được tự động cập nhật vào hệ thống!";
    } else {
      saveStatus.className = "status-msg status-error";
      saveStatus.textContent = "Lưu điểm thất bại: " + (result.message || "");
    }
  } catch (err) {
    saveStatus.className = "status-msg status-error";
    saveStatus.textContent = "Không thể gửi dữ liệu điểm về máy chủ.";
  }
}

function restartQuiz() {
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("quiz-intro").classList.remove("hidden");
}

function logout() {
  localStorage.removeItem("user_session");
  window.location.reload();
}