const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ===== CẤU HÌNH GOOGLE DRIVE API ĐỂ QUÉT ẢNH =====
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '11Xq62s2eTNgi1AGmiWKf4R8Or_x1Qf6O'; 

const getDriveClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'), 
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  return google.drive({ version: 'v3', auth });
};
// ==================================================

const createResponse = (success, data, message = "") => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success, data, message })
  };
};

const capitalizeWords = (str) => {
  if (!str) return "";
  return str.trim().toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getClientIp = (event) => {
  const headers = event.headers || {};
  return headers['x-nf-client-connection-ip'] || headers['client-ip'] || (headers['x-forwarded-for'] ? headers['x-forwarded-for'].split(',')[0].trim() : null) || '127.0.0.1';
};

const parseDeviceInfo = (userAgent = "") => {
  let os = "Thiết bị khác";
  if (/windows nt 10/i.test(userAgent)) os = "Windows 10/11";
  else if (/windows nt 6.3/i.test(userAgent)) os = "Windows 8.1";
  else if (/windows nt 6.1/i.test(userAgent)) os = "Windows 7";
  else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS (iPhone/iPad)";
  else if (/linux/i.test(userAgent)) os = "Linux";

  let browser = "Trình duyệt";
  if (/edg\//i.test(userAgent)) browser = "Edge";
  else if (/chrome|crios/i.test(userAgent)) browser = "Chrome";
  else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";

  return `${os} (${browser})`;
};

const parseMemeIds = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(Number);
  if (typeof data === 'string') {
    try {
      return JSON.parse(data).map(Number);
    } catch (e) {
      return data.replace(/[{}[\]"']/g, '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
    }
  }
  return [];
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('schools').select('name, is_hidden, is_exam_locked');
      if (error) throw error;
      return createResponse(true, { schools: data || [] });
    }

    const body = JSON.parse(event.body || "{}");
    const action = body.action || "login";

    /* ĐĂNG NHẬP VÀ KIỂM TRA IP/TÀI KHOẢN BỊ KHÓA */
    if (action === "login") {
      const username = body.username.trim();
      const password = body.password.trim();
      const ipAddress = getClientIp(event);
      const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || '';
      const deviceName = body.client_device_name || parseDeviceInfo(userAgent);

      const { data: isBanned } = await supabase.from('banned_ips').select('ip_address, reason').eq('ip_address', ipAddress).single();
      if (isBanned) return createResponse(false, null, `${isBanned.reason}`);

      const { data: isAccountBanned } = await supabase.from('banned_accounts').select('username, reason').eq('username', username).single();
      if (isAccountBanned) return createResponse(false, null, `${isAccountBanned.reason}`);

      let { data: adminData } = await supabase.from('admins').select('id, username, role, full_name').eq('username', username).eq('password', password).single();
      if (adminData) {
        await supabase.from('login_history').insert([{ user_id: adminData.id, admin_id: adminData.id, username: adminData.username, role: 'teacher', full_name: adminData.full_name || 'Giáo viên', ip_address: ipAddress, device_name: deviceName }]);
        return createResponse(true, { id: adminData.id, username: adminData.username, role: 'teacher', adminRole: adminData.role, fullName: adminData.full_name });
      }

      let { data: studentData, error: stuErr } = await supabase.from('students').select('id, username, full_name, last_name, first_name, class_name, school, grade, username_change_limit').eq('username', username).eq('password', password).single();
      if (stuErr || !studentData) return createResponse(false, null, "Sai tên đăng nhập hoặc mật khẩu!");

      await supabase.from('login_history').insert([{ user_id: studentData.id, student_id: studentData.id, username: studentData.username, role: 'student', full_name: studentData.full_name, ip_address: ipAddress, device_name: deviceName }]);
      return createResponse(true, { id: studentData.id, username: studentData.username, role: 'student', fullName: studentData.full_name, lastName: studentData.last_name, firstName: studentData.first_name, className: studentData.class_name, school: studentData.school, grade: studentData.grade || '7', username_change_limit: studentData.username_change_limit !== undefined ? studentData.username_change_limit : 2 });
    }

    if (action === "get_login_history") {
      const limit = body.limit || 1000;
      let query = supabase.from('login_history').select(`id, user_id, student_id, admin_id, username, role, full_name, ip_address, device_name, login_at, students (class_name)`).order('login_at', { ascending: false }).limit(limit);
      if (body.role && body.role !== 'ALL') query = query.eq('role', body.role);
      const { data: logs, error } = await query;
      if (error) return createResponse(false, null, "Lỗi khi lấy nhật ký: " + error.message);

      let enrichedLogs = logs || [];
      const missingUsernames = enrichedLogs.filter(l => l.role === 'student' && (!l.students || !l.students.class_name) && l.username).map(l => l.username);
      let fallbackClassMap = {};
      if (missingUsernames.length > 0) {
        const { data: fallbackStudents } = await supabase.from('students').select('username, class_name').in('username', [...new Set(missingUsernames)]);
        (fallbackStudents || []).forEach(s => fallbackClassMap[s.username] = s.class_name);
      }
      const formattedLogs = enrichedLogs.map(log => ({ ...log, class_name: (log.students && log.students.class_name) ? log.students.class_name : fallbackClassMap[log.username] || "" }));
      return createResponse(true, { logs: formattedLogs });
    }

    if (action === "clear_login_history") {
      const { role } = body;
      let query = supabase.from('login_history').delete();
      if (role && role !== 'ALL') query = query.eq('role', role);
      else query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      await query;
      return createResponse(true, null, "Đã xóa nhật ký.");
    }

    if (action === "delete_ip_logs") {
      const { ip_address } = body;
      await supabase.from('login_history').delete().eq('ip_address', ip_address);
      return createResponse(true, null, `Đã xóa dữ liệu IP ${ip_address}.`);
    }

    if (action === "get_ip_management") {
      const { data: logs } = await supabase.from('login_history').select('ip_address, username, role, device_name, login_at').order('login_at', { ascending: false }).limit(2000);
      const { data: bannedData } = await supabase.from('banned_ips').select('ip_address, reason');
      const bannedIpsMap = {};
      (bannedData || []).forEach(b => bannedIpsMap[b.ip_address] = b.reason);
      const ipMap = {};
      (logs || []).forEach(log => {
        if (!ipMap[log.ip_address]) ipMap[log.ip_address] = { ip_address: log.ip_address, accounts: new Set(), devices: new Set(), last_login: log.login_at, is_banned: !!bannedIpsMap[log.ip_address], ban_reason: bannedIpsMap[log.ip_address] || "" };
        ipMap[log.ip_address].accounts.add(`${log.username} (${log.role === 'teacher' ? 'GV' : 'HS'})`);
        ipMap[log.ip_address].devices.add(log.device_name || "Không xác định");
      });
      const ipList = Object.values(ipMap).map(item => ({ ...item, accounts: Array.from(item.accounts), devices: Array.from(item.devices) }));
      return createResponse(true, { ip_list: ipList });
    }

    if (action === "ban_account") {
      const { username, reason } = body;
      const { error } = await supabase.from('banned_accounts').insert([{ username, reason: reason || "Vi phạm quy chế" }]);
      if (error && error.code === '23505') return createResponse(false, null, "Đã bị khóa từ trước!");
      return createResponse(true, null, `Khóa tài khoản ${username} thành công!`);
    }

    if (action === "unban_account") {
      await supabase.from('banned_accounts').delete().eq('username', body.username);
      return createResponse(true, null, `Đã mở khóa ${body.username}.`);
    }

    if (action === "ban_ip") {
      const { ip_address, reason } = body;
      const { error } = await supabase.from('banned_ips').insert([{ ip_address, reason: reason || "Vi phạm quy chế" }]);
      if (error && error.code === '23505') return createResponse(false, null, "IP đã bị khóa từ trước!");
      return createResponse(true, null, `Khóa IP ${ip_address} thành công!`);
    }

    if (action === "unban_ip") {
      await supabase.from('banned_ips').delete().eq('ip_address', body.ip_address);
      return createResponse(true, null, `Mở khóa IP ${body.ip_address}.`);
    }

    if (action === "get_student_scores") {
      const { data, error } = await supabase.from('scores').select('score_1, score_2, score_3, score_4, score_5, feedback').eq('student_id', body.id).single();
      if (error || !data) return createResponse(false, null, "Chưa có bảng điểm.");
      return createResponse(true, { scores: [data.score_1, data.score_2, data.score_3, data.score_4, data.score_5].map(s => s === null ? "" : s), feedback: data.feedback || "" });
    }

    if (action === "save_feedback") {
      await supabase.from('scores').update({ feedback: body.feedback || "" }).eq('student_id', body.student_id);
      return createResponse(true, null, "Lưu đánh giá thành công!");
    }

    if (action === "get_student_info") {
      const { data: student, error } = await supabase.from('students').select('id, username, full_name, last_name, first_name, class_name, school, grade, username_change_limit').eq('id', body.id).single();
      if (error || !student) return createResponse(false, null, "Không tìm thấy học sinh.");
      let { data: itemData } = await supabase.from('items').select('coins, total_coins, spent_coins, meme_id_list, pending_coins, reward_notice, reward_status').eq('student_id', body.id).single();
      if (!itemData) {
        await supabase.from('items').insert([{ student_id: body.id, coins: 100, total_coins: 100, spent_coins: 0, pending_coins: 0, reward_notice: null, reward_status: null, meme_id_list: [] }]);
        itemData = { coins: 100, total_coins: 100, spent_coins: 0, pending_coins: 0, reward_notice: null, reward_status: null, meme_id_list: [] };
      }
      return createResponse(true, { ...student, grade: student.grade || '7', username_change_limit: student.username_change_limit !== undefined ? student.username_change_limit : 2, coins: itemData.coins !== undefined ? itemData.coins : 100, total_coins: itemData.total_coins !== undefined ? itemData.total_coins : 100, spent_coins: itemData.spent_coins !== undefined ? itemData.spent_coins : 0, pending_coins: itemData.pending_coins !== undefined ? itemData.pending_coins : 0, reward_notice: itemData.reward_notice || null, reward_status: itemData.reward_status || null, meme_id_list: parseMemeIds(itemData.meme_id_list) });
    }

    if (action === "update_student_highlight") {
      let highlightValue = (body.status === true || body.status === "true") ? true : (body.status === false || body.status === "false") ? false : null;
      await supabase.from('students').update({ is_highlighted: highlightValue }).eq('id', body.student_id);
      return createResponse(true, { is_highlighted: highlightValue }, "Đã cập nhật trạng thái.");
    }

    if (action === "request_reward_coins") {
      const coinsNum = parseInt(body.requested_coins, 10);
      if (!body.student_id || isNaN(coinsNum) || coinsNum <= 0) return createResponse(false, null, "Số xu không hợp lệ!");
      const { data: itemData } = await supabase.from('items').select('pending_coins').eq('student_id', body.student_id).single();
      const newPending = (itemData && itemData.pending_coins !== undefined ? Number(itemData.pending_coins) : 0) + coinsNum;
      await supabase.from('items').update({ pending_coins: newPending, reward_notice: null, reward_status: null }).eq('student_id', body.student_id);
      return createResponse(true, { pending_coins: newPending }, `Gửi yêu cầu cộng ${coinsNum} xu thành công!`);
    }

    if (action === "clear_reward_notice") {
      await supabase.from('items').update({ reward_notice: null, reward_status: null }).eq('student_id', body.student_id);
      return createResponse(true, null, "Đã xóa thông báo!");
    }

    if (action === "get_pending_rewards") {
      const { data } = await supabase.from('items').select(`pending_coins, student_id, students (id, full_name, username, class_name, school)`).gt('pending_coins', 0);
      const requests = (data || []).map(row => ({ student_id: row.student_id, pending_coins: row.pending_coins, full_name: row.students ? row.students.full_name : "", username: row.students ? row.students.username : "", class_name: row.students ? row.students.class_name : "", school: row.students ? row.students.school : "" }));
      return createResponse(true, { requests });
    }

    if (action === "approve_reward") {
      const { data: itemData } = await supabase.from('items').select('coins, total_coins, pending_coins').eq('student_id', body.student_id).single();
      const pending = Number(itemData.pending_coins) || 0;
      await supabase.from('items').update({ coins: (Number(itemData.coins) || 0) + pending, total_coins: (Number(itemData.total_coins) || 0) + pending, pending_coins: 0, reward_notice: `Yêu cầu nhận ${pending} xu phát biểu của bạn đã được giáo viên duyệt thành công! 🎉`, reward_status: 'approved' }).eq('student_id', body.student_id);
      return createResponse(true, null, `Đã duyệt ${pending} xu!`);
    }

    if (action === "reject_reward") {
      const noticeText = body.reason && body.reason.trim() !== "" ? `Yêu cầu nhận xu bị từ chối. Lý do: ${body.reason.trim()}` : "Yêu cầu nhận xu bị từ chối.";
      await supabase.from('items').update({ pending_coins: 0, reward_notice: noticeText, reward_status: 'rejected' }).eq('student_id', body.student_id);
      return createResponse(true, null, "Đã từ chối.");
    }

    if (action === "approve_all_rewards") {
      let query = supabase.from('items').select('student_id, coins, total_coins, pending_coins').gt('pending_coins', 0);
      if (body.student_ids && Array.isArray(body.student_ids) && body.student_ids.length > 0) query = query.in('student_id', body.student_ids);
      const { data: itemsList } = await query;
      const updatePromises = (itemsList || []).map(item => {
        const pending = Number(item.pending_coins) || 0;
        return supabase.from('items').update({ coins: (Number(item.coins) || 0) + pending, total_coins: (Number(item.total_coins) || 0) + pending, pending_coins: 0, reward_notice: `Yêu cầu nhận ${pending} xu phát biểu của bạn đã được giáo viên duyệt thành công! 🎉`, reward_status: 'approved' }).eq('student_id', item.student_id);
      });
      await Promise.all(updatePromises);
      return createResponse(true, null, `Đã duyệt tất cả.`);
    }

    if (action === "get_students") {
      let query = supabase.from('students').select(`id, full_name, last_name, first_name, class_name, username, grade, is_highlighted, scores (score_1, score_2, score_3, score_4, score_5, feedback), items (coins, total_coins, spent_coins, meme_id_list)`).eq('school', body.school);
      if (body.className) query = query.eq('class_name', body.className.trim().toUpperCase());
      const { data, error } = await query;
      if (error) throw error;
      const { data: bannedAccounts } = await supabase.from('banned_accounts').select('username');
      const bannedSet = new Set((bannedAccounts || []).map(b => b.username));

      const students = data.map(row => {
        let totalScore = 0, countScore = 0;
        const s = row.scores || {};
        [s.score_1, s.score_2, s.score_3, s.score_4, s.score_5].forEach(val => { if (val !== null && val !== undefined) { totalScore += Number(val); countScore++; } });
        const avgScore = countScore > 0 ? (totalScore / countScore).toFixed(1) : 0;
        const studentItems = row.items || {};
        return { id: row.id, fullName: row.full_name, lastName: row.last_name, firstName: row.first_name, className: row.class_name, grade: row.grade || '7', username: row.username, password: row.password || null, is_highlighted: row.is_highlighted !== undefined ? row.is_highlighted : null, feedback: s.feedback || "", coins: studentItems.coins !== undefined ? studentItems.coins : 100, total_coins: studentItems.total_coins !== undefined ? studentItems.total_coins : 100, spent_coins: studentItems.spent_coins !== undefined ? studentItems.spent_coins : 0, meme_id_list: parseMemeIds(studentItems.meme_id_list), score: `${avgScore} / ${totalScore}`, is_banned: bannedSet.has(row.username) };
      });
      return createResponse(true, { students });
    }

    /* Các tính năng Create, Update, Delete học sinh, tạo trường... giữ nguyên */
    if (action === "update_student") {
      const formattedLastName = capitalizeWords(body.lastName);
      const formattedFirstName = capitalizeWords(body.firstName);
      const fullName = `${formattedLastName} ${formattedFirstName}`.trim();
      const payload = { last_name: formattedLastName, first_name: formattedFirstName, full_name: fullName, class_name: body.className ? body.className.trim().toUpperCase() : "" };
      if (body.password) payload.password = body.password.trim();
      await supabase.from('students').update(payload).eq('id', body.student_id);
      
      if (body.coin_delta) {
        const delta = Number(body.coin_delta) || 0;
        const { data: itemData } = await supabase.from('items').select('coins, total_coins').eq('student_id', body.student_id).single();
        let curCoins = itemData && itemData.coins !== undefined ? Number(itemData.coins) : 100;
        let curTotal = itemData && itemData.total_coins !== undefined ? Number(itemData.total_coins) : curCoins;
        await supabase.from('items').update({ coins: curCoins + delta, total_coins: curTotal + delta }).eq('student_id', body.student_id);
      }
      return createResponse(true, null, "Cập nhật thành công!");
    }

    if (action === "batch_update_coins") {
      const delta = Number(body.coin_delta);
      const { data: itemsData } = await supabase.from('items').select('student_id, coins, total_coins').in('student_id', body.student_ids);
      const itemMap = {};
      (itemsData || []).forEach(it => itemMap[it.student_id] = it);
      const updatePromises = body.student_ids.map(sid => {
        const it = itemMap[sid];
        let curCoins = it && it.coins !== undefined ? Number(it.coins) : 100;
        let curTotal = it && it.total_coins !== undefined ? Number(it.total_coins) : curCoins;
        return supabase.from('items').update({ coins: curCoins + delta, total_coins: curTotal + delta }).eq('student_id', sid);
      });
      await Promise.all(updatePromises);
      return createResponse(true, null, `Đã cập nhật xu!`);
    }

    if (action === "batch_update_class") {
      await supabase.from('students').update({ class_name: body.new_class.trim().toUpperCase() }).in('id', body.student_ids);
      return createResponse(true, null, `Đã chuyển lớp.`);
    }

    if (action === "delete_student") {
      const { data: adminData } = await supabase.from('admins').select('id').eq('username', body.teacher_username).eq('password', body.password).single();
      if (!adminData) return createResponse(false, null, "Mật khẩu không chính xác!");
      await supabase.from('scores').delete().eq('student_id', body.student_id);
      await supabase.from('items').delete().eq('student_id', body.student_id);
      await supabase.from('students').delete().eq('id', body.student_id);
      return createResponse(true, null, "Đã xóa.");
    }

    if (action === "batch_delete_students") {
      const { data: adminData } = await supabase.from('admins').select('id').eq('username', body.teacher_username).eq('password', body.password).single();
      if (!adminData) return createResponse(false, null, "Mật khẩu không chính xác!");
      await supabase.from('scores').delete().in('student_id', body.student_ids);
      await supabase.from('items').delete().in('student_id', body.student_ids);
      await supabase.from('students').delete().in('id', body.student_ids);
      return createResponse(true, null, "Đã xóa.");
    }
    
    if (action === "student_change_password") {
      const { student_id, old_password, new_password } = body;
      if (!student_id || old_password === undefined || new_password === undefined || new_password === "") return createResponse(false, null, "Vui lòng nhập đầy đủ!");
      const { data: student } = await supabase.from('students').select('password').eq('id', student_id).single();
      if (!student || student.password !== old_password.trim()) return createResponse(false, null, "Mật khẩu hiện tại không chính xác!");
      await supabase.from('students').update({ password: new_password.trim() }).eq('id', student_id);
      return createResponse(true, null, "Đổi mật khẩu thành công!");
    }

    if (action === "student_change_username") {
      const { student_id, password, new_username } = body;
      if (!student_id || !password || !new_username) return createResponse(false, null, "Vui lòng nhập đầy đủ!");
      const cleanUsername = new_username.trim().toLowerCase();
      if (!/^[a-z0-9_.]{3,30}$/.test(cleanUsername)) return createResponse(false, null, "Tên tài khoản từ 3-30 ký tự (chữ thường, số, dấu chấm hoặc gạch dưới)!");
      const { data: student } = await supabase.from('students').select('password, username_change_limit, username').eq('id', student_id).single();
      if (!student || student.password !== password.trim()) return createResponse(false, null, "Mật khẩu xác nhận không chính xác!");
      const currentLimit = student.username_change_limit !== undefined ? student.username_change_limit : 2;
      if (currentLimit <= 0) return createResponse(false, null, "Bạn đã hết số lần được phép đổi tên tài khoản!");
      if (cleanUsername === (student.username || '').toLowerCase()) return createResponse(false, null, "Tên tài khoản mới trùng với tên hiện tại!");
      const { data: existStudent } = await supabase.from('students').select('id').eq('username', cleanUsername).single();
      const { data: existAdmin } = await supabase.from('admins').select('id').eq('username', cleanUsername).single();
      if (existStudent || existAdmin) return createResponse(false, null, "Tên tài khoản này đã có người sử dụng!");
      const newLimit = currentLimit - 1;
      await supabase.from('students').update({ username: cleanUsername, username_change_limit: newLimit }).eq('id', student_id);
      return createResponse(true, { new_username: cleanUsername, remaining_limit: newLimit }, `Đổi tên tài khoản thành công! Bạn còn ${newLimit} lần đổi.`);
    }

    /*========================================================================*/
    /*                 XỬ LÝ MEME VÀ QUÉT GOOGLE DRIVE                        */
    /*========================================================================*/

    // 1. Quét Drive tìm ảnh chưa có thông tin
    if (action === "scan_pending_memes") {
      const drive = getDriveClient();
      
      // BỔ SUNG LẤY "thumbnailLink" TỪ GOOGLE DRIVE API
      const driveRes = await drive.files.list({
        q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false and mimeType contains 'image/'`,
        fields: 'files(id, name, thumbnailLink)'
      });
      const driveFiles = driveRes.data.files || [];

      // Lấy danh sách link ảnh đã được lưu trong Supabase
      const { data: dbMemes } = await supabase.from('meme').select('image');
      const dbUrls = (dbMemes || []).map(m => m.image || '');

      // Lọc ra các file Drive mà ID của nó CHƯA tồn tại trong Supabase
      const pendingMemes = driveFiles.filter(file => {
        return !dbUrls.some(url => url.includes(file.id));
      }).map(file => {
        
        // THỦ THUẬT VƯỢT LỖI HIỂN THỊ CỦA GOOGLE DRIVE:
        // Dùng thumbnailLink thay vì link gốc. Replace =s220 thành =s1000 để nét hơn.
        let safeUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        if (file.thumbnailLink) {
          safeUrl = file.thumbnailLink.replace(/=s\d+/, '=s1000');
        }

        return {
          driveId: file.id,
          fileName: file.name,
          directUrl: safeUrl 
        };
      });

      return createResponse(true, { pendingMemes }, "Quét thành công.");
    }

    // 2. Thêm Meme mới từ ảnh quét được
    if (action === "add_meme_from_drive") {
      const { image_url, slogan, rarity } = body;
      if (!image_url || !slogan) return createResponse(false, null, "Thiếu thông tin!");

      const { error } = await supabase.from('meme').insert([{ 
        image: image_url, 
        slogan: slogan.trim(), 
        rarity: rarity || "C" 
      }]);

      if (error) return createResponse(false, null, "Lỗi lưu meme vào DB: " + error.message);
      return createResponse(true, null, "Đã thêm meme vào hệ thống.");
    }

    // Lấy toàn bộ Meme hiện có
    if (action === "get_all_memes") {
      let { data: memes, error } = await supabase.from('meme').select('id, image, slogan, rarity');
      if (error) return createResponse(false, null, "Lỗi lấy danh sách meme.");
      return createResponse(true, { memes: memes || [] });
    }

    // Cập nhật Meme hiện có (Giữ nguyên link, chỉ đổi nội dung)
    if (action === "update_meme") {
      const { id, old_slogan, slogan, rarity } = body;
      let targetId = id;
      if (!targetId && old_slogan) {
        const { data: existingMeme } = await supabase.from('meme').select('id').eq('slogan', old_slogan).single();
        if (existingMeme) targetId = existingMeme.id;
      }
      if (!targetId) return createResponse(false, null, "Không xác định được meme cần sửa!");

      const { error } = await supabase.from('meme').update({ 
        slogan: slogan.trim(), 
        rarity: rarity ? rarity.trim().split(" ")[0] : "C" 
      }).eq('id', targetId);

      if (error) return createResponse(false, null, "Lỗi cập nhật: " + error.message);
      return createResponse(true, null, "Cập nhật thành công!");
    }

    // Xóa Meme khỏi Supabase
    if (action === "delete_meme") {
      const { id, slogan } = body;
      let query = supabase.from('meme').delete();
      if (id) query = query.eq('id', id);
      else if (slogan) query = query.eq('slogan', slogan);
      else return createResponse(false, null, "Không xác định được meme cần xóa!");

      const { error } = await query;
      if (error) return createResponse(false, null, "Lỗi xóa meme: " + error.message);
      return createResponse(true, null, "Đã xóa meme khỏi hệ thống!");
    }

    /*========================================================================*/

    if (action === "pull_gacha") {
      const { student_id } = body;
      let { data: itemData, error: itemErr } = await supabase.from('items').select('coins, total_coins, spent_coins, meme_id_list').eq('student_id', student_id).single();
      if (itemErr || !itemData) return createResponse(false, null, "Không tìm thấy dữ liệu ví của học sinh.");
      
      const currentCoins = itemData.coins !== undefined ? itemData.coins : 100;
      const gachaCost = 30;
      if (currentCoins < gachaCost) return createResponse(false, null, "Bạn không đủ 30 Xu để quay Gacha!");

      let { data: memesList } = await supabase.from('meme').select('id, image, slogan, rarity');
      if (!memesList || memesList.length === 0) return createResponse(false, null, "Hệ thống chưa có dữ liệu meme!");

      const poolSS = memesList.filter(m => m.rarity === 'SS');
      const poolS = memesList.filter(m => m.rarity === 'S');
      const poolA = memesList.filter(m => m.rarity === 'A');
      const poolB = memesList.filter(m => m.rarity === 'B');
      const poolC = memesList.filter(m => m.rarity === 'C');

      const roll = Math.random() * 100;
      let selectedPool = (roll < 1 && poolSS.length > 0) ? poolSS : (roll < 6 && poolS.length > 0) ? poolS : (roll < 16 && poolA.length > 0) ? poolA : (roll < 46 && poolB.length > 0) ? poolB : (poolC.length > 0 ? poolC : memesList);
      if (selectedPool.length === 0) selectedPool = memesList;

      const randomMeme = selectedPool[Math.floor(Math.random() * selectedPool.length)];
      let updatedInventoryIds = [...parseMemeIds(itemData.meme_id_list)];
      updatedInventoryIds.push(randomMeme.id);

      await supabase.from('items').update({ coins: currentCoins - gachaCost, spent_coins: (itemData.spent_coins || 0) + gachaCost, total_coins: itemData.total_coins || currentCoins, meme_id_list: updatedInventoryIds }).eq('student_id', student_id);
      return createResponse(true, { coins: currentCoins - gachaCost, total_coins: itemData.total_coins || currentCoins, spent_coins: (itemData.spent_coins || 0) + gachaCost, wonMeme: randomMeme, meme_id_list: updatedInventoryIds }, "Quay Gacha thành công!");
    }

    if (action === "transfer_meme") {
      const { sender_id, recipient_username, meme_id } = body;
      const { data: recipient } = await supabase.from('students').select('id, full_name, username').ilike('username', recipient_username.trim().toLowerCase()).single();
      if (!recipient) return createResponse(false, null, `Không tìm thấy tài khoản "${recipient_username}"!`);
      if (recipient.id === sender_id) return createResponse(false, null, "Không thể tự tặng thẻ!");

      const { data: senderItems } = await supabase.from('items').select('meme_id_list').eq('student_id', sender_id).single();
      const parsedMemeId = Number(meme_id);
      const senderList = parseMemeIds(senderItems.meme_id_list);
      if (senderList.filter(id => id === parsedMemeId).length < 2) return createResponse(false, null, "Cần sở hữu từ 2 thẻ trở lên!");

      let { data: recipItems } = await supabase.from('items').select('meme_id_list').eq('student_id', recipient.id).single();
      let recipList = recipItems ? parseMemeIds(recipItems.meme_id_list) : [];

      const removeIndex = senderList.findIndex(id => id === parsedMemeId);
      if (removeIndex > -1) senderList.splice(removeIndex, 1);
      recipList.push(parsedMemeId);

      await supabase.from('items').update({ meme_id_list: senderList }).eq('student_id', sender_id);
      await supabase.from('items').update({ meme_id_list: recipList }).eq('student_id', recipient.id);

      return createResponse(true, { updated_meme_id_list: senderList, recipient_name: recipient.full_name || recipient.username }, `Đã tặng thẻ cho ${recipient.full_name || recipient.username}!`);
    }

    return createResponse(false, null, "Hành động không hợp lệ.");
  } catch (err) {
    return createResponse(false, null, "Lỗi Server: " + err.message);
  }
};