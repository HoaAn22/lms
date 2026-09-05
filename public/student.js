document.addEventListener("DOMContentLoaded", () => {
  const session = checkAuth("student");
  if (!session) return;

  const displayName = session.fullName || session.username;
  const headerNameEl = document.getElementById("header-student-name-text");
  if (headerNameEl) headerNameEl.textContent = displayName;

  document.getElementById("stu-fullname").textContent = session.fullName || "---";
  document.getElementById("stu-class").textContent = session.className || "---";
  document.getElementById("stu-school").textContent = session.school || "---";

  // Điền dữ liệu vào tab Tài Khoản
  const accUserEl = document.getElementById("acc-username");
  const accFullEl = document.getElementById("acc-fullname");
  const accClassEl = document.getElementById("acc-class");
  const accSchoolEl = document.getElementById("acc-school");

  if (accUserEl) accUserEl.textContent = session.username || "---";
  if (accFullEl) accFullEl.textContent = session.fullName || "---";
  if (accClassEl) accClassEl.textContent = session.className || "---";
  if (accSchoolEl) accSchoolEl.textContent = session.school || "---";

  // Khôi phục tab trước đó (chuyển sang tổng quan nếu còn lưu tab mini game cũ)
  let savedStudentTab = sessionStorage.getItem("student_active_tab");
  if (savedStudentTab === "tab-minigame") {
    savedStudentTab = "tab-overview";
  }

  if (savedStudentTab && document.getElementById(savedStudentTab)) {
    switchStudentTab(savedStudentTab);
  }

  loadStudentData();
  renderGachaHistory();
});

function switchStudentTab(tabId) {
  document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".student-nav .nav-btn").forEach(b => b.classList.remove("active"));
  
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add("active");

  const targetBtn = document.getElementById("btn-" + tabId);
  if (targetBtn) targetBtn.classList.add("active");

  sessionStorage.setItem("student_active_tab", tabId);

  if (tabId === "tab-collection") {
    loadStudentCollection();
  }
}

let studentCoins = 100;
let studentTotalCoins = 100;
let studentSpentCoins = 0;
let studentMemeIds = [];
let studentMemesCache = [];
let currentStudentFilter = 'ALL';
let currentViewingMeme = null;

async function loadStudentData() {
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_student_info", id: session.id })
    });
    const result = await res.json();

    if (result.success && result.data) {
      studentCoins = result.data.coins !== undefined ? Number(result.data.coins) : 100;
      studentTotalCoins = result.data.total_coins !== undefined ? Number(result.data.total_coins) : 100;
      studentSpentCoins = result.data.spent_coins !== undefined ? Number(result.data.spent_coins) : 0;
      studentMemeIds = (result.data.meme_id_list || []).map(id => Number(id));
      
      updateCoinsDisplay();
      loadStudentCollection();
    }
  } catch (err) {
    console.error("Lỗi tải thông tin học sinh:", err);
  }

  loadStudentScores();
}

function updateCoinsDisplay() {
  const coinsEl = document.getElementById("user-coins");
  const spentEl = document.getElementById("user-spent-coins");
  if (coinsEl) coinsEl.textContent = studentCoins;
  if (spentEl) spentEl.textContent = studentSpentCoins;
}

async function syncStudentDataToDB() {
  const session = getSession();
  if (!session) return;

  try {
    await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_student_items",
        student_id: session.id,
        coins: studentCoins,
        total_coins: studentTotalCoins,
        spent_coins: studentSpentCoins,
        meme_id_list: studentMemeIds
      })
    });
  } catch (err) {
    console.error("Lỗi đồng bộ dữ liệu xu/meme:", err);
  }
}

async function loadStudentScores() {
  const session = getSession();
  const tableBody = document.getElementById("score-table-body");
  const feedbackEl = document.getElementById("stu-teacher-feedback");
  tableBody.innerHTML = `<tr><td colspan="3">Đang đồng bộ dữ liệu điểm...</td></tr>`;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_student_scores", id: session.id })
    });
    const result = await res.json();

    if (result.success && result.data) {
      // 1. Gán nội dung Lời phê của giáo viên
      if (feedbackEl) {
        if (result.data.feedback && result.data.feedback.trim() !== "") {
          feedbackEl.textContent = `"${result.data.feedback.trim()}"`;
          feedbackEl.style.color = "#1e293b";
          feedbackEl.style.fontWeight = "500";
        } else {
          feedbackEl.textContent = "Chưa có nhận xét nào từ giáo viên.";
          feedbackEl.style.color = "#64748b";
          feedbackEl.style.fontWeight = "normal";
        }
      }

      // 2. Bảng điểm
      const scores = result.data.scores || [];
      tableBody.innerHTML = "";
      
      let total = 0, count = 0;
      scores.forEach((sc, idx) => {
        const val = sc !== "" && sc !== null ? Number(sc) : null;
        if (val !== null) {
          total += val;
          count++;
        }
        
        let evaluation = "Chưa có điểm";
        if (val !== null) {
          if (val >= 8) evaluation = "Giỏi 🌟";
          else if (val >= 6.5) evaluation = "Khá 👍";
          else if (val >= 5) evaluation = "Trung bình 📚";
          else evaluation = "Cần cố gắng ⚠️";
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>Cột điểm ${idx + 1}</td>
          <td><strong>${val !== null ? val : '---'}</strong></td>
          <td>${evaluation}</td>
        `;
        tableBody.appendChild(tr);
      });

      const avg = count > 0 ? (total / count).toFixed(1) : "--";
      document.getElementById("average-score").textContent = avg;
      
      let rank = "--";
      if (count > 0) {
        if (avg >= 8) rank = "Giỏi 🌟";
        else if (avg >= 6.5) rank = "Khá 👍";
        else if (avg >= 5) rank = "Trung bình 📚";
        else rank = "Cần cố gắng ⚠️";
      }
      document.getElementById("academic-rank").textContent = rank;
    } else {
      tableBody.innerHTML = `<tr><td colspan="3">Chưa có dữ liệu bảng điểm.</td></tr>`;
      if (feedbackEl) feedbackEl.textContent = "Chưa có nhận xét nào từ giáo viên.";
    }
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Lỗi kết nối máy chủ!</td></tr>`;
    if (feedbackEl) feedbackEl.textContent = "Không thể tải nhận xét từ giáo viên.";
  }
}

/* Lịch sử quay Gacha trong phiên (Session Storage) */
function getGachaSessionHistory() {
  try {
    return JSON.parse(sessionStorage.getItem("gacha_session_history") || "[]");
  } catch (e) {
    return [];
  }
}

function addGachaHistoryItem(meme) {
  const history = getGachaSessionHistory();
  const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  history.unshift({
    rarity: meme.rarity,
    slogan: meme.slogan,
    image: meme.image,
    time: timeNow
  });
  sessionStorage.setItem("gacha_session_history", JSON.stringify(history));
  renderGachaHistory();
}

function renderGachaHistory() {
  const container = document.getElementById("gacha-history-list");
  if (!container) return;

  const history = getGachaSessionHistory();
  if (history.length === 0) {
    container.innerHTML = `<div style="color: #94a3b8; font-size: 13px; text-align: center; padding: 12px;">Lịch sử Gacha sẽ xóa khi đăng xuất</div>`;
    return;
  }

  container.innerHTML = "";
  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "gacha-history-item";
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${item.image}" alt="Meme">
        <div>
          <span class="rarity-tag" style="padding: 1px 6px; font-size: 10px; margin-bottom: 2px;">${item.rarity}</span>
          <div style="font-weight: 500; color: #1e293b; max-width: 220px; word-break: break-word;">${item.slogan}</div>
        </div>
      </div>
      <span style="font-size: 11px; color: #94a3b8;">${item.time}</span>
    `;
    container.appendChild(div);
  });
}

function clearGachaHistory() {
  sessionStorage.removeItem("gacha_session_history");
  renderGachaHistory();
}

/* Vòng quay Gacha */
async function pullGacha() {
  const session = getSession();
  const cost = 30;
  const notice = document.getElementById("gacha-result-notice");
  notice.textContent = "";

  if (studentCoins < cost) {
    notice.textContent = "Bạn không đủ Xu để quay! Hãy làm bài kiểm tra để nhận thêm Xu.";
    return;
  }

  const btnPull = document.getElementById("btn-pull-gacha");
  const gachaBox = document.getElementById("gacha-box");
  
  btnPull.disabled = true;
  gachaBox.classList.add("shaking");
  notice.textContent = "✨ Đang mở hộp quà bí ẩn... ⏳";

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pull_gacha", student_id: session.id })
    });
    const result = await res.json();

    setTimeout(() => {
      gachaBox.classList.remove("shaking");
      btnPull.disabled = false;

      if (!res.ok || !result.success) {
        notice.textContent = result.message || "Lỗi quay Gacha!";
        return;
      }

      studentCoins = Number(result.data.coins);
      studentSpentCoins = Number(result.data.spent_coins !== undefined ? result.data.spent_coins : studentSpentCoins + cost);
      studentTotalCoins = Number(result.data.total_coins !== undefined ? result.data.total_coins : studentTotalCoins);
      studentMemeIds = (result.data.meme_id_list || []).map(id => Number(id));
      
      updateCoinsDisplay();
      loadStudentCollection();

      const won = result.data.wonMeme;
      notice.innerHTML = `🎉 Chúc mừng! Bạn nhận được meme [${won.rarity}]: <strong>${won.slogan}</strong>`;

      addGachaHistoryItem(won);
    }, 1200);

  } catch (err) {
    gachaBox.classList.remove("shaking");
    btnPull.disabled = false;
    notice.textContent = "Lỗi kết nối máy chủ!";
  }
}

async function loadStudentCollection() {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;
  
  grid.innerHTML = `<div style="grid-column: span 3; text-align: center; color: #64748b; padding: 20px;">Đang tải bộ sưu tập...</div>`;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_all_memes" })
    });
    const result = await res.json();

    if (!result.success || !result.data.memes) {
      grid.innerHTML = `<p style="color: #64748b; font-size: 14px;">Chưa có dữ liệu meme trong hệ thống.</p>`;
      return;
    }

    studentMemesCache = result.data.memes;
    renderStudentCollection();

  } catch (err) {
    grid.innerHTML = `<p style="color: red; font-size: 14px;">Lỗi tải bộ sưu tập từ máy chủ.</p>`;
  }
}

function filterStudentMemes(rarity, btnElement) {
  currentStudentFilter = rarity;
  document.querySelectorAll("#student-filter-bar .filter-btn").forEach(b => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");
  renderStudentCollection();
}

function renderStudentCollection() {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;

  const rarityOrder = { 'SS': 1, 'S': 2, 'A': 3, 'B': 4, 'C': 5 };

  let sorted = [...studentMemesCache].sort((a, b) => {
    let rA = rarityOrder[a.rarity] || 99;
    let rB = rarityOrder[b.rarity] || 99;
    return rA - rB;
  });

  if (currentStudentFilter !== 'ALL') {
    sorted = sorted.filter(m => m.rarity === currentStudentFilter);
  }

  if (sorted.length === 0) {
    grid.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 14px;">Không có meme nào thuộc độ hiếm này.</p>`;
    return;
  }

  grid.innerHTML = "";
  sorted.forEach(meme => {
    const count = studentMemeIds.filter(id => id === Number(meme.id)).length;
    const isUnlocked = count > 0;
    
    const card = document.createElement("div");
    card.className = `meme-card-item ${isUnlocked ? 'unlocked' : 'locked'}`;

    if (isUnlocked) {
      card.onclick = () => openMemeViewModal(meme, count);
      card.innerHTML = `
        <div>
          <span class="rarity-tag">${meme.rarity}</span>
          <div class="meme-img-wrapper">
            <img src="${meme.image}" alt="Meme">
            <span class="meme-count-badge">x${count}</span>
          </div>
        </div>
        <div class="meme-slogan">${meme.slogan}</div>
      `;
    } else {
      card.innerHTML = `
        <div>
          <span class="rarity-tag" style="background:#94a3b8;">${meme.rarity}</span>
          <div style="height: 120px; background: #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🔒</div>
        </div>
        <div class="meme-slogan" style="color: #94a3b8; font-style: italic;">Chưa mở khóa</div>
      `;
    }
    grid.appendChild(card);
  });
}

/* Xem chi tiết Meme & Tặng Thẻ Dư */
function openMemeViewModal(meme, count) {
  const modal = document.getElementById("view-meme-modal");
  if (!modal) return;

  currentViewingMeme = meme;

  document.getElementById("view-meme-rarity").textContent = meme.rarity;
  document.getElementById("view-meme-count").textContent = `Sở hữu: x${count}`;
  document.getElementById("view-meme-img").src = meme.image;
  document.getElementById("view-meme-slogan").textContent = meme.slogan;

  const shareBox = document.getElementById("view-meme-share-box");
  const shareInputSection = document.getElementById("share-input-section");
  const targetInput = document.getElementById("target-student-username");
  const shareNotice = document.getElementById("share-notice");

  if (shareInputSection) shareInputSection.style.display = "none";
  if (targetInput) targetInput.value = "";
  if (shareNotice) {
    shareNotice.textContent = "";
    shareNotice.style.color = "";
  }

  if (shareBox) {
    if (count >= 2) {
      shareBox.style.display = "block";
    } else {
      shareBox.style.display = "none";
    }
  }

  modal.classList.add("show");
}

function toggleShareInput() {
  const inputSec = document.getElementById("share-input-section");
  if (inputSec) {
    inputSec.style.display = inputSec.style.display === "none" ? "block" : "none";
  }
}

async function confirmTransferCard() {
  const session = getSession();
  if (!session || !currentViewingMeme) return;

  const targetInput = document.getElementById("target-student-username");
  const noticeEl = document.getElementById("share-notice");
  const btnConfirm = document.getElementById("btn-confirm-transfer");
  const targetUsername = targetInput ? targetInput.value.trim() : "";

  if (!targetUsername) {
    noticeEl.textContent = "Vui lòng nhập tên tài khoản của bạn nhận!";
    noticeEl.style.color = "#ef4444";
    return;
  }

  btnConfirm.disabled = true;
  noticeEl.textContent = "Đang kiểm tra tài khoản và gửi thẻ...";
  noticeEl.style.color = "#2563eb";

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transfer_meme",
        sender_id: session.id,
        recipient_username: targetUsername,
        meme_id: currentViewingMeme.id
      })
    });
    const result = await res.json();

    if (!result.success) {
      noticeEl.textContent = result.message || "Không thể tặng thẻ!";
      noticeEl.style.color = "#ef4444";
      btnConfirm.disabled = false;
      return;
    }

    studentMemeIds = (result.data.updated_meme_id_list || []).map(id => Number(id));
    const updatedCount = studentMemeIds.filter(id => id === Number(currentViewingMeme.id)).length;
    
    document.getElementById("view-meme-count").textContent = `Sở hữu: x${updatedCount}`;

    noticeEl.textContent = result.message;
    noticeEl.style.color = "#16a34a";
    targetInput.value = "";

    if (updatedCount < 2) {
      setTimeout(() => {
        const shareBox = document.getElementById("view-meme-share-box");
        if (shareBox) shareBox.style.display = "none";
      }, 1500);
    }

    renderStudentCollection();

  } catch (err) {
    noticeEl.textContent = "Lỗi kết nối máy chủ!";
    noticeEl.style.color = "#ef4444";
  } finally {
    btnConfirm.disabled = false;
  }
}

function closeMemeViewModal() {
  const modal = document.getElementById("view-meme-modal");
  if (modal) {
    modal.classList.remove("show");
  }
}

document.querySelectorAll(".btn-logout-sm, [onclick*='logout']").forEach(btn => {
  btn.addEventListener("click", () => {
    sessionStorage.removeItem("gacha_session_history");
  });
});