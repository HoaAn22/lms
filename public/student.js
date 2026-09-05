document.addEventListener("DOMContentLoaded", () => {
  const session = checkAuth("student");
  if (!session) return;

  document.getElementById("header-student-name").textContent = session.fullName || session.username;
  document.getElementById("stu-fullname").textContent = session.fullName || "---";
  document.getElementById("stu-class").textContent = session.className || "---";
  document.getElementById("stu-school").textContent = session.school || "---";

  loadStudentData();
});

function switchStudentTab(tabId) {
  document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".student-nav .nav-btn").forEach(b => b.classList.remove("active"));
  
  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");
}

let studentCoins = 100;
let studentInventory = [];

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
      studentInventory = result.data.inventory || [];
      
      updateCoinsDisplay();
      renderInventory();
    }
  } catch (err) {
    console.error("Lỗi tải thông tin học sinh:", err);
  }

  loadStudentScores();
}

function updateCoinsDisplay() {
  document.getElementById("user-coins").textContent = studentCoins;
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
        items: studentInventory
      })
    });
  } catch (err) {
    console.error("Lỗi đồng bộ dữ liệu xu/vật phẩm:", err);
  }
}

async function loadStudentScores() {
  const session = getSession();
  const tableBody = document.getElementById("score-table-body");
  tableBody.innerHTML = `<tr><td colspan="3">Đang đồng bộ dữ liệu điểm...</td></tr>`;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_student_scores", id: session.id })
    });
    const result = await res.json();

    if (result.success && result.data.scores) {
      const scores = result.data.scores;
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
    }
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Lỗi kết nối máy chủ!</td></tr>`;
  }
}

let gameInterval = null;
let gameScoreCount = 0;
let timeLeft = 30;

function startMiniGame() {
  document.getElementById("game-intro").classList.add("hidden");
  document.getElementById("game-over").classList.add("hidden");
  document.getElementById("game-play").classList.remove("hidden");

  gameScoreCount = 0;
  timeLeft = 30;
  document.getElementById("game-timer").textContent = timeLeft + "s";

  generateGameQuestion();

  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("game-timer").textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(gameInterval);
      endMiniGame();
    }
  }, 1000);
}

function generateGameQuestion() {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const isAddition = Math.random() > 0.5;
  const correctAnswer = isAddition ? num1 + num2 : num1 - num2;

  document.getElementById("game-question").textContent = `${num1} ${isAddition ? '+' : '-'} ${num2} = ?`;

  const optionsContainer = document.getElementById("game-options");
  optionsContainer.innerHTML = "";

  let options = [correctAnswer];
  while (options.length < 4) {
    let wrong = correctAnswer + Math.floor(Math.random() * 10) - 5;
    if (!options.includes(wrong)) options.push(wrong);
  }
  options.sort(() => Math.random() - 0.5);

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.textContent = opt;
    btn.onclick = () => {
      if (opt === correctAnswer) {
        gameScoreCount++;
      }
      generateGameQuestion();
    };
    optionsContainer.appendChild(btn);
  });
}

async function endMiniGame() {
  document.getElementById("game-play").classList.add("hidden");
  document.getElementById("game-over").classList.remove("hidden");
  
  document.getElementById("game-score").textContent = gameScoreCount;
  const coinsEarned = gameScoreCount * 10;
  document.getElementById("game-coins-earned").textContent = `+${coinsEarned} 🪙`;

  if (coinsEarned > 0) {
    studentCoins += coinsEarned;
    updateCoinsDisplay();
    await syncStudentDataToDB();
  }
}

const gachaPool = [
  "🛡️ Khiên Thần Rồng", "⚔️ Kiếm Ánh Sáng", "📜 Bí Kíp Ma Thuật", 
  "🧪 Bình Độc Dược Bí Ẩn", "💎 Viên Ngọc Rồng", "🦊 Linh Thú Cáo Chín Đuôi"
];

async function pullGacha() {
  const cost = 30;
  if (studentCoins < cost) {
    alert("Bạn không đủ Xu để quay! Hãy làm bài tập hoặc chơi mini-game để kiếm thêm xu.");
    return;
  }

  const btnPull = document.getElementById("btn-pull-gacha");
  const gachaBox = document.getElementById("gacha-box");
  
  btnPull.disabled = true;
  gachaBox.classList.add("shaking");

  setTimeout(async () => {
    gachaBox.classList.remove("shaking");
    btnPull.disabled = false;

    studentCoins -= cost;
    updateCoinsDisplay();

    const randomItem = gachaPool[Math.floor(Math.random() * gachaPool.length)];
    studentInventory.push(randomItem);
    
    renderInventory();
    await syncStudentDataToDB();

    alert(`🎉 Chúc mừng bạn nhận được vật phẩm: ${randomItem}!`);
  }, 1000);
}

function renderInventory() {
  const grid = document.getElementById("inventory-grid");
  grid.innerHTML = "";

  if (studentInventory.length === 0) {
    grid.innerHTML = `<p style="color: #64748b; font-size: 14px;">Kho đồ trống. Hãy dùng Xu để quay Gacha!</p>`;
    return;
  }

  studentInventory.forEach(item => {
    const div = document.createElement("div");
    div.className = "inventory-item-card";
    div.innerHTML = `<span>🎁</span><strong>${item}</strong>`;
    grid.appendChild(div);
  });
}