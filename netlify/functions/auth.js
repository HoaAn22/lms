const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp'); // Thư viện nén và chuyển đổi ảnh WebP

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ===== CẤU HÌNH CLOUDFLARE R2 API =====
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // VD: https://pub-xxxxxx.r2.dev
// ======================================

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

const GACHA_RARITIES = ['SS', 'S', 'A', 'B', 'C'];
const getTargetPullLimits = (settings = {}) => Object.fromEntries(
  GACHA_RARITIES.map(rarity => [
    rarity,
    Number(settings[`target_pull_limit_${rarity.toLowerCase()}`]) || null
  ])
);

const pickMemeByOriginalRarity = (memes) => {
  const poolSS = memes.filter(meme => meme.rarity === 'SS');
  const poolS = memes.filter(meme => meme.rarity === 'S');
  const poolA = memes.filter(meme => meme.rarity === 'A');
  const poolB = memes.filter(meme => meme.rarity === 'B');
  const poolC = memes.filter(meme => meme.rarity === 'C');
  const roll = Math.random() * 100;
  const selectedPool = (roll < 1 && poolSS.length > 0) ? poolSS
    : (roll < 6 && poolS.length > 0) ? poolS
      : (roll < 16 && poolA.length > 0) ? poolA
        : (roll < 46 && poolB.length > 0) ? poolB
          : (poolC.length > 0 ? poolC : memes);

  return selectedPool[Math.floor(Math.random() * selectedPool.length)];
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      let { data, error } = await supabase.from('schools').select('name, is_hidden, is_exam_locked, is_reward_sharing_locked');
      if (error && `${error.code || ''} ${error.message || ''}`.includes('is_reward_sharing_locked')) {
        const fallback = await supabase.from('schools').select('name, is_hidden, is_exam_locked');
        if (fallback.error) throw fallback.error;
        data = (fallback.data || []).map(school => ({ ...school, is_reward_sharing_locked: false }));
      } else if (error) {
        throw error;
      }
      return createResponse(true, { schools: data || [] });
    }

    const body = JSON.parse(event.body || "{}");
    const action = body.action || "login";

    /* CÁC ACTION ĐĂNG NHẬP, QUẢN LÝ LỊCH SỬ, ĐIỂM, HỌC SINH ĐƯỢC GIỮ NGUYÊN BẢN VÁ EGRESS */
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

      const studentClassName = typeof studentData.class_name === 'string'
        ? studentData.class_name.trim().toUpperCase()
        : '';
      const { data: classAccess, error: classAccessError } = studentClassName
        ? await supabase
            .from('class_schedules')
            .select('is_login_locked')
            .eq('school', studentData.school)
            .eq('class_name', studentClassName)
            .maybeSingle()
        : { data: null, error: null };
      if (classAccessError) {
        if (`${classAccessError.code || ''} ${classAccessError.message || ''}`.includes('is_login_locked')) {
          return createResponse(false, null, "Cơ sở dữ liệu chưa được cập nhật tính năng khóa đăng nhập theo lớp. Hãy chạy trong Supabase SQL Editor: ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS is_login_locked boolean NOT NULL DEFAULT false;");
        }
        return createResponse(false, null, "Không thể xác minh trạng thái lớp học. Vui lòng thử lại sau.");
      }
      if (classAccess?.is_login_locked) {
        return createResponse(false, null, "Lớp học của bạn hiện đang bị khóa đăng nhập. Vui lòng liên hệ giáo viên.");
      }

      await supabase.from('login_history').insert([{
        user_id: studentData.id,
        student_id: studentData.id,
        username: studentData.username,
        role: 'student',
        full_name: studentData.full_name,
        ip_address: ipAddress,
        device_name: deviceName
      }]);

      return createResponse(true, { id: studentData.id, username: studentData.username, role: 'student', fullName: studentData.full_name, lastName: studentData.last_name, firstName: studentData.first_name, className: studentData.class_name, school: studentData.school, grade: studentData.grade || '7', username_change_limit: studentData.username_change_limit !== undefined ? studentData.username_change_limit : 2 });
    }

    if (action === "get_school_classes") {
      const school = typeof body.school === 'string' ? body.school.trim() : '';
      if (!school) return createResponse(false, null, "Vui lòng chọn trường học.");

      const { data: scheduleRows, error: schedulesError } = await supabase
        .from('class_schedules')
        .select('class_name, is_login_locked')
        .eq('school', school);
      if (schedulesError) {
        if (`${schedulesError.code || ''} ${schedulesError.message || ''}`.includes('is_login_locked')) {
          return createResponse(false, null, "Cơ sở dữ liệu chưa được cập nhật tính năng khóa đăng nhập theo lớp. Hãy chạy trong Supabase SQL Editor: ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS is_login_locked boolean NOT NULL DEFAULT false;");
        }
        return createResponse(false, null, "Lỗi khi tải trạng thái khóa lớp: " + schedulesError.message);
      }

      const studentRows = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('students')
          .select('class_name')
          .eq('school', school)
          .range(offset, offset + pageSize - 1);
        if (error) return createResponse(false, null, "Lỗi khi tải danh sách lớp: " + error.message);
        studentRows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      const lockedByClass = new Map((scheduleRows || []).map(row => [
        typeof row.class_name === 'string' ? row.class_name.trim().toUpperCase() : '',
        row.is_login_locked === true
      ]));
      const classes = [...new Set((studentRows || [])
        .map(row => typeof row.class_name === 'string' ? row.class_name.trim().toUpperCase() : '')
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(class_name => ({ class_name, is_login_locked: lockedByClass.get(class_name) || false }));

      return createResponse(true, { classes });
    }

    if (action === "toggle_class_login_lock") {
      const school = typeof body.school === 'string' ? body.school.trim() : '';
      const className = typeof body.class_name === 'string' ? body.class_name.trim().toUpperCase() : '';
      const teacherUsername = typeof body.teacher_username === 'string' ? body.teacher_username.trim() : '';
      if (!school || !className || typeof body.is_login_locked !== 'boolean' || !teacherUsername) {
        return createResponse(false, null, "Thông tin trường, lớp hoặc trạng thái khóa không hợp lệ.");
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('admins')
        .select('id')
        .eq('username', teacherUsername)
        .maybeSingle();
      if (teacherError) return createResponse(false, null, "Không thể xác minh tài khoản giáo viên: " + teacherError.message);
      if (!teacherData) return createResponse(false, null, "Không thể xác minh tài khoản giáo viên.");

      const { data: existingSchedule, error: existingScheduleError } = await supabase
        .from('class_schedules')
        .select('schedule_days, is_locked')
        .eq('school', school)
        .eq('class_name', className)
        .maybeSingle();
      if (existingScheduleError) {
        if (`${existingScheduleError.code || ''} ${existingScheduleError.message || ''}`.includes('is_login_locked')) {
          return createResponse(false, null, "Cơ sở dữ liệu chưa được cập nhật tính năng khóa đăng nhập theo lớp. Hãy chạy trong Supabase SQL Editor: ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS is_login_locked boolean NOT NULL DEFAULT false;");
        }
        return createResponse(false, null, "Không thể đọc cấu hình lớp: " + existingScheduleError.message);
      }

      const { error: updateError } = existingSchedule
        ? await supabase.from('class_schedules').update({ is_login_locked: body.is_login_locked }).eq('school', school).eq('class_name', className)
        : await supabase.from('class_schedules').insert([{
            school,
            class_name: className,
            schedule_days: [],
            is_locked: false,
            is_login_locked: body.is_login_locked
          }]);
      if (updateError) {
        if (`${updateError.code || ''} ${updateError.message || ''}`.includes('is_login_locked')) {
          return createResponse(false, null, "Cơ sở dữ liệu chưa được cập nhật tính năng khóa đăng nhập theo lớp. Hãy chạy trong Supabase SQL Editor: ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS is_login_locked boolean NOT NULL DEFAULT false;");
        }
        return createResponse(false, null, "Lỗi khi cập nhật trạng thái khóa lớp: " + updateError.message);
      }

      return createResponse(true, null, body.is_login_locked
        ? `Đã khóa đăng nhập lớp ${className}.`
        : `Đã mở khóa đăng nhập lớp ${className}.`);
    }

    if (action === "get_login_history") {
      const limit = body.limit || 1000;
      let query = supabase.from('login_history')
        .select(`id, user_id, student_id, admin_id, username, role, full_name, ip_address, device_name, login_at, students (class_name)`)
        .order('login_at', { ascending: false })
        .limit(limit);

      if (body.role && body.role !== 'ALL') query = query.eq('role', body.role);
      const { data: logs, error } = await query;
      if (error) return createResponse(false, null, "Lỗi khi lấy nhật ký: " + error.message);

      let enrichedLogs = logs || [];

      const missingLogs = enrichedLogs.filter(l => l.role === 'student' && (!l.students || !l.students.class_name));

      const missingIds = [...new Set(missingLogs.flatMap(l => [l.student_id, l.user_id]).filter(Boolean))];
      // Loại bỏ điều kiện !l.student_id để luôn dùng username làm phương án cứu cánh cuối cùng
      const missingUsernames = [...new Set(missingLogs.filter(l => l.username).map(l => l.username))];

      let fallbackClassMapById = {};
      let fallbackClassMapByUsername = {};

      if (missingIds.length > 0) {
        const { data: studentsById, error: studentsByIdError } = await supabase
          .from('students')
          .select('id, class_name')
          .in('id', missingIds);
        if (studentsByIdError) return createResponse(false, null, "Lỗi khi đối chiếu học sinh theo ID: " + studentsByIdError.message);
        (studentsById || []).forEach(s => fallbackClassMapById[s.id] = s.class_name);
      }

      if (missingUsernames.length > 0) {
        const { data: studentsByUsername, error: studentsByUsernameError } = await supabase
          .from('students')
          .select('username, class_name')
          .in('username', missingUsernames);
        if (studentsByUsernameError) return createResponse(false, null, "Lỗi khi đối chiếu học sinh theo tài khoản: " + studentsByUsernameError.message);
        (studentsByUsername || []).forEach(s => fallbackClassMapByUsername[s.username] = s.class_name);
      }

      const formattedLogs = enrichedLogs.map(log => {
        let finalClassName = "";

        if (log.students && log.students.class_name) {
          finalClassName = log.students.class_name; // Mức 1: Bảng gốc còn liên kết tốt
        } else if (log.student_id && fallbackClassMapById[log.student_id]) {
          finalClassName = fallbackClassMapById[log.student_id]; // Mức 2: ID còn tồn tại nhưng mất liên kết Join
        } else if (log.user_id && fallbackClassMapById[log.user_id]) {
          finalClassName = fallbackClassMapById[log.user_id]; // Mức 2: Bản ghi cũ lưu ID học sinh trong user_id
        } else if (log.username && fallbackClassMapByUsername[log.username]) {
          finalClassName = fallbackClassMapByUsername[log.username]; // Mức 3: ID đã chết nhưng Username vẫn khớp với tài khoản tạo lại
        } else if ((log.student_id && Object.prototype.hasOwnProperty.call(fallbackClassMapById, log.student_id)) ||
                   (log.user_id && Object.prototype.hasOwnProperty.call(fallbackClassMapById, log.user_id)) ||
                   (log.username && Object.prototype.hasOwnProperty.call(fallbackClassMapByUsername, log.username))) {
          finalClassName = "Chưa cập nhật lớp";
        } else {
          finalClassName = "Tài khoản đã xóa"; // Mức 4: Xóa hoàn toàn
        }

        return { ...log, class_name: finalClassName };
      });

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
      let { data: itemData } = await supabase.from('items').select('coins, total_coins, spent_coins, meme_id_list, pending_coins, reward_notice, reward_status, gacha_target_meme_id, gacha_target_pull_count, gacha_new_pull_count').eq('student_id', body.id).single();
      if (!itemData) {
        await supabase.from('items').insert([{ student_id: body.id, coins: 100, total_coins: 100, spent_coins: 0, pending_coins: 0, reward_notice: null, reward_status: null, meme_id_list: [], gacha_target_meme_id: null, gacha_target_pull_count: 0, gacha_new_pull_count: 0 }]);
        itemData = { coins: 100, total_coins: 100, spent_coins: 0, pending_coins: 0, reward_notice: null, reward_status: null, meme_id_list: [], gacha_target_meme_id: null, gacha_target_pull_count: 0, gacha_new_pull_count: 0 };
      }
      const { data: gachaSettings, error: settingsError } = await supabase.from('gacha_settings').select('target_enabled, target_pull_limit_ss, target_pull_limit_s, target_pull_limit_a, target_pull_limit_b, target_pull_limit_c, new_meme_enabled, new_meme_pull_limit').eq('id', 1).maybeSingle();
      if (settingsError) return createResponse(false, null, "Không thể tải quy tắc quay thưởng. Giáo viên cần cập nhật cơ sở dữ liệu gacha_settings.");
      const resolvedSettings = gachaSettings || { target_enabled: false, new_meme_enabled: false, new_meme_pull_limit: null };
      return createResponse(true, { ...student, grade: student.grade || '7', username_change_limit: student.username_change_limit !== undefined ? student.username_change_limit : 2, coins: itemData.coins !== undefined ? itemData.coins : 100, total_coins: itemData.total_coins !== undefined ? itemData.total_coins : 100, spent_coins: itemData.spent_coins !== undefined ? itemData.spent_coins : 0, pending_coins: itemData.pending_coins !== undefined ? itemData.pending_coins : 0, reward_notice: itemData.reward_notice || null, reward_status: itemData.reward_status || null, meme_id_list: parseMemeIds(itemData.meme_id_list), gacha_target_meme_id: itemData.gacha_target_meme_id || null, gacha_target_pull_count: Number(itemData.gacha_target_pull_count) || 0, gacha_new_pull_count: Number(itemData.gacha_new_pull_count) || 0, gacha_settings: { ...resolvedSettings, target_pull_limits: getTargetPullLimits(resolvedSettings) } });
    }

    if (action === "get_gacha_settings") {
      const { data, error } = await supabase.from('gacha_settings').select('target_enabled, target_pull_limit_ss, target_pull_limit_s, target_pull_limit_a, target_pull_limit_b, target_pull_limit_c, new_meme_enabled, new_meme_pull_limit').eq('id', 1).maybeSingle();
      if (error) return createResponse(false, null, "Không thể tải cài đặt quay thưởng. Hãy chạy tệp migration Supabase mới nhất.");
      const settings = data || { target_enabled: false, new_meme_enabled: false, new_meme_pull_limit: null };
      return createResponse(true, { ...settings, target_pull_limits: getTargetPullLimits(settings) });
    }

    if (action === "save_gacha_settings") {
      const targetEnabled = body.target_enabled === true;
      const newMemeEnabled = body.new_meme_enabled === true;
      const newMemeLimit = Number(body.new_meme_pull_limit);
      const targetPullLimits = {};
      for (const rarity of GACHA_RARITIES) {
        const rawLimit = body.target_pull_limits?.[rarity];
        if (rawLimit === null || rawLimit === undefined || rawLimit === "") {
          targetPullLimits[rarity] = null;
          continue;
        }
        const limit = Number(rawLimit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
          return createResponse(false, null, `Số lượt mục tiêu độ hiếm ${rarity} phải là số nguyên từ 1 đến 10000.`);
        }
        targetPullLimits[rarity] = limit;
      }
      if (targetEnabled && !GACHA_RARITIES.some(rarity => targetPullLimits[rarity] !== null)) {
        return createResponse(false, null, "Hãy nhập số lượt mục tiêu cho ít nhất một độ hiếm.");
      }
      if (newMemeEnabled && (!Number.isInteger(newMemeLimit) || newMemeLimit < 1 || newMemeLimit > 10000)) {
        return createResponse(false, null, "Số lượt bảo đảm thẻ mới phải là số nguyên từ 1 đến 10000.");
      }

      const { data, error } = await supabase.from('gacha_settings').upsert({
        id: 1,
        target_enabled: targetEnabled,
        target_pull_limit: targetEnabled ? Math.min(...GACHA_RARITIES.map(rarity => targetPullLimits[rarity]).filter(Number.isInteger)) : null,
        target_pull_limit_ss: targetEnabled ? targetPullLimits.SS : null,
        target_pull_limit_s: targetEnabled ? targetPullLimits.S : null,
        target_pull_limit_a: targetEnabled ? targetPullLimits.A : null,
        target_pull_limit_b: targetEnabled ? targetPullLimits.B : null,
        target_pull_limit_c: targetEnabled ? targetPullLimits.C : null,
        new_meme_enabled: newMemeEnabled,
        new_meme_pull_limit: newMemeEnabled ? newMemeLimit : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).select('target_enabled, target_pull_limit_ss, target_pull_limit_s, target_pull_limit_a, target_pull_limit_b, target_pull_limit_c, new_meme_enabled, new_meme_pull_limit').single();
      if (error) return createResponse(false, null, "Không thể lưu cài đặt quay thưởng. Hãy chạy tệp migration Supabase mới nhất.");
      return createResponse(true, { ...data, target_pull_limits: getTargetPullLimits(data) }, "Đã lưu cài đặt quay thưởng.");
    }

    if (action === "set_gacha_target") {
      const studentId = body.student_id;
      const targetMemeId = body.target_meme_id === null || body.target_meme_id === "" ? null : Number(body.target_meme_id);
      if (!studentId || (targetMemeId !== null && !Number.isInteger(targetMemeId))) {
        return createResponse(false, null, "Thẻ mục tiêu không hợp lệ.");
      }

      const { data: itemData, error: itemError } = await supabase.from('items').select('meme_id_list').eq('student_id', studentId).single();
      if (itemError || !itemData) return createResponse(false, null, "Không tìm thấy bộ sưu tập của học sinh.");

      if (targetMemeId !== null) {
        const { data: meme, error: memeError } = await supabase.from('meme').select('id, rarity').eq('id', targetMemeId).maybeSingle();
        if (memeError || !meme) return createResponse(false, null, "Không tìm thấy thẻ mục tiêu.");
        if (parseMemeIds(itemData.meme_id_list).includes(targetMemeId)) {
          return createResponse(false, null, "Bạn đã sở hữu thẻ này. Hãy chọn một thẻ chưa có.");
        }
        const { data: settings, error: settingsError } = await supabase.from('gacha_settings').select('target_enabled, target_pull_limit_ss, target_pull_limit_s, target_pull_limit_a, target_pull_limit_b, target_pull_limit_c').eq('id', 1).maybeSingle();
        if (settingsError) return createResponse(false, null, "Không thể xác minh cài đặt mục tiêu.");
        if (!settings?.target_enabled || !getTargetPullLimits(settings)[meme.rarity]) {
          return createResponse(false, null, `Giáo viên chưa thiết lập số lượt mục tiêu cho độ hiếm ${meme.rarity}.`);
        }
      }

      const { data, error } = await supabase.from('items').update({ gacha_target_meme_id: targetMemeId }).eq('student_id', studentId).select('gacha_target_meme_id, gacha_target_pull_count').single();
      if (error) return createResponse(false, null, "Không thể cập nhật thẻ mục tiêu. Hãy chạy tệp migration Supabase mới nhất.");
      return createResponse(true, data, targetMemeId === null ? "Đã bỏ mục tiêu. Tiến độ lượt mục tiêu được giữ lại." : "Đã đặt thẻ mục tiêu. Tiến độ lượt hiện có được giữ lại.");
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
      let query = supabase.from('students').select(`id, full_name, last_name, first_name, class_name, username, password, grade, is_highlighted, scores (score_1, score_2, score_3, score_4, score_5, feedback), items (coins, total_coins, spent_coins, meme_id_list)`).eq('school', body.school);
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

    if (action === "batch_create_students") {
      const { school, className, grade, students } = body;

      if (!school || !className || !Array.isArray(students) || students.length === 0) {
        return createResponse(false, null, "Vui lòng nhập đầy đủ thông tin lớp, trường và danh sách học sinh!");
      }

      const { data: existSchool } = await supabase.from('schools').select('name').eq('name', school).single();
      if (!existSchool) {
        await supabase.from('schools').insert([{ name: school, is_hidden: false, is_exam_locked: false }]);
      }

      const { data: existingStudents } = await supabase.from('students').select('username');
      const { data: existingAdmins } = await supabase.from('admins').select('username');

      const usedUsernames = new Set([
        ...(existingStudents || []).map(s => (s.username || '').toLowerCase()),
        ...(existingAdmins || []).map(a => (a.username || '').toLowerCase())
      ]);

      const insertedStudents = [];

      for (const stu of students) {
        const lastName = capitalizeWords(stu.lastName || "");
        const firstName = capitalizeWords(stu.firstName || "");
        const fullName = `${lastName} ${firstName}`.trim();

        let base = stu.usernameBase || stu.username;
        let finalUsername = stu.username || base;
        let counter = 1;

        while (usedUsernames.has(finalUsername.toLowerCase())) {
          finalUsername = `${base}${counter}`;
          counter++;
        }
        usedUsernames.add(finalUsername.toLowerCase());

        const startingCoins = stu.coins !== undefined ? Number(stu.coins) : 100;

        const { data: newUser, error: userErr } = await supabase.from('students').insert([{
          username: finalUsername,
          password: stu.password || "123",
          full_name: fullName,
          last_name: lastName,
          first_name: firstName,
          class_name: className.trim().toUpperCase(),
          school: school,
          grade: grade || '7',
          username_change_limit: 2,
          is_highlighted: null
        }]).select().single();

        if (userErr) throw userErr;

        await supabase.from('scores').insert([{ student_id: newUser.id, feedback: "" }]);
        await supabase.from('items').insert([{
          student_id: newUser.id,
          coins: startingCoins,
          total_coins: startingCoins,
          spent_coins: 0,
          pending_coins: 0,
          reward_notice: null,
          reward_status: null,
          meme_id_list: []
        }]);

        insertedStudents.push(newUser);
      }

      return createResponse(true, { count: insertedStudents.length }, `Đã tạo thành công ${insertedStudents.length} tài khoản học sinh!`);
    }

    if (action === "create_student") {
      const { school } = body;
      const lastName = capitalizeWords(body.lastName);
      const firstName = capitalizeWords(body.firstName);
      const className = body.className ? body.className.trim().toUpperCase() : "";
      const username = body.username ? body.username.trim() : "";
      const password = body.password ? body.password.trim() : "";
      const fullName = `${lastName} ${firstName}`.trim();
      
      const matchGrade = className.match(/\d/);
      const grade = body.grade || (matchGrade ? matchGrade[0] : '7');

      const { data: existAdmin } = await supabase
        .from('admins')
        .select('username')
        .eq('username', username)
        .single();

      if (existAdmin) {
        return createResponse(false, null, "Tài khoản đã tồn tại trong hệ thống!");
      }

      const { data: existSchool } = await supabase.from('schools').select('name').eq('name', school).single();
      if (!existSchool) {
        await supabase.from('schools').insert([{ name: school, is_hidden: false, is_exam_locked: false }]);
      }

      const { data: newUser, error: userErr } = await supabase.from('students').insert([{
        username, password, full_name: fullName, 
        last_name: lastName, first_name: firstName, class_name: className, school,
        grade: grade,
        username_change_limit: 2,
        is_highlighted: null
      }]).select().single();

      if (userErr) {
        if (userErr.code === '23505') return createResponse(false, null, "Tài khoản đã tồn tại trong hệ thống!");
        throw userErr;
      }

      await supabase.from('scores').insert([{ student_id: newUser.id, feedback: "" }]);
      await supabase.from('items').insert([{
        student_id: newUser.id,
        coins: 100,
        total_coins: 100,
        spent_coins: 0,
        pending_coins: 0,
        reward_notice: null,
        reward_status: null,
        meme_id_list: []
      }]);

      return createResponse(true, {
        id: newUser.id, fullName: newUser.full_name, lastName: newUser.last_name,
        firstName: newUser.first_name, className: newUser.className,
        username: newUser.username, school: newUser.school,
        grade: newUser.grade || grade,
        username_change_limit: 2
      }, `Tạo thành công học sinh ${fullName}!`);
    }

    if (action === "create_school") {
      const schoolName = body.school ? body.school.trim() : "";
      if (!schoolName) return createResponse(false, null, "Tên trường không được để trống!");

      const { error } = await supabase.from('schools').insert([{ name: schoolName, is_hidden: false, is_exam_locked: false }]);
      if (error) {
        if (error.code === '23505') return createResponse(false, null, "Trường này đã tồn tại trong hệ thống!");
        throw error;
      }
      return createResponse(true, null, "Tạo trường thành công!");
    }

    if (action === "delete_school") {
      const { school, teacher_username, password } = body;
      
      const { data: adminData, error: adminErr } = await supabase
        .from('admins')
        .select('id') 
        .eq('username', teacher_username)
        .eq('password', password)
        .single();

      if (adminErr || !adminData) {
        return createResponse(false, null, "Mật khẩu xác nhận không chính xác!");
      }

      const { error: deleteErr } = await supabase
        .from('schools')
        .delete()
        .eq('name', school);

      if (deleteErr) return createResponse(false, null, "Lỗi khi xóa trường học.");
      return createResponse(true, null, `Đã xóa thành công trường "${school}"!`);
    }

    if (action === "save_score") {
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('is_exam_locked')
        .eq('name', body.school)
        .single();

      if (schoolErr || !schoolData) {
        return createResponse(false, null, "Không thể xác thực trạng thái trường học.");
      }

      if (schoolData.is_exam_locked) {
        return createResponse(false, null, "Bài thi đã đóng. Không thể nộp bài vào lúc này!");
      }

      const colName = `score_${body.scoreColumn}`;
      const { error } = await supabase.from('scores').update({ [colName]: body.score }).eq('student_id', body.id);
      if (error) return createResponse(false, null, "Lỗi cập nhật điểm.");
      return createResponse(true, null, "Cập nhật điểm thành công!");
    }

    if (action === "toggle_school") {
      const { error } = await supabase
        .from('schools')
        .update({ is_hidden: body.is_hidden })
        .eq('name', body.school);

      if (error) return createResponse(false, null, "Lỗi cập nhật trạng thái trường.");
      return createResponse(true, null, "Cập nhật trạng thái thành công!");
    }

    if (action === "toggle_school_exam_lock") {
      const { school, is_exam_locked } = body;
      const { error } = await supabase
        .from('schools')
        .update({ is_exam_locked })
        .eq('name', school);

      if (error) return createResponse(false, null, "Lỗi cập nhật trạng thái khóa bài thi của trường.");
      return createResponse(true, null, "Cập nhật thành công!");
    }

    if (action === "toggle_school_reward_sharing_lock") {
      const { school, is_reward_sharing_locked } = body;
      const { error } = await supabase
        .from('schools')
        .update({ is_reward_sharing_locked })
        .eq('name', school);

      if (error) {
        if (`${error.code || ''} ${error.message || ''}`.includes('is_reward_sharing_locked')) {
          return createResponse(false, null, "Cơ sở dữ liệu chưa có cột khóa chia sẻ. Hãy chạy trong Supabase SQL Editor: ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_reward_sharing_locked boolean NOT NULL DEFAULT false;");
        }
        return createResponse(false, null, "Lỗi cập nhật trạng thái khóa chia sẻ phần thưởng của trường.");
      }
      return createResponse(true, null, is_reward_sharing_locked ? "Đã khóa chia sẻ phần thưởng cho trường." : "Đã mở khóa chia sẻ phần thưởng cho trường.");
    }

    if (action === "get_school_exam_status") {
      const { school } = body;
      const { data, error } = await supabase
        .from('schools')
        .select('is_exam_locked')
        .eq('name', school)
        .single();

      if (error || !data) return createResponse(true, { is_exam_locked: false });
      return createResponse(true, { is_exam_locked: data.is_exam_locked || false });
    }

    if (action === "get_school_reward_sharing_status") {
      const { school } = body;
      const { data, error } = await supabase
        .from('schools')
        .select('is_reward_sharing_locked')
        .eq('name', school)
        .single();

      if (error || !data) return createResponse(true, { is_reward_sharing_locked: false });
      return createResponse(true, { is_reward_sharing_locked: data.is_reward_sharing_locked || false });
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
    /*                 XỬ LÝ MEME VÀ QUÉT CLOUDFLARE R2 BUCKET                */
    /*========================================================================*/

    // 1. Quét R2 tìm ảnh chưa có thông tin
    if (action === "scan_pending_memes") {
      try {
        // Lấy danh sách file trong R2 Bucket
        const data = await s3Client.send(new ListObjectsV2Command({
          Bucket: BUCKET_NAME
        }));
        
        const r2Files = data.Contents || [];

        // Lấy danh sách link ảnh đã được lưu trong Supabase
        const { data: dbMemes } = await supabase.from('meme').select('image');
        const dbUrls = (dbMemes || []).map(m => m.image || '');

        // Lọc ra các file R2 mà tên file (Key) CHƯA tồn tại trong Supabase
        const pendingMemes = r2Files.filter(file => {
          // Chỉ lấy file ảnh (bỏ qua thư mục hoặc file khác định dạng)
          if (!file.Key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return false;
          
          return !dbUrls.some(url => url.includes(file.Key));
        }).map(file => {
          // Bỏ dấu "/" ở cuối URL gốc nếu có để tránh trùng lặp gạch chéo
          const baseUrl = PUBLIC_URL.replace(/\/$/, "");
          let safeUrl = `${baseUrl}/${file.Key}`;

          return {
            driveId: file.Key, // Giữ nguyên key driveId để giao diện Frontend không phải sửa lại code
            fileName: file.Key,
            directUrl: safeUrl 
          };
        });

        return createResponse(true, { pendingMemes }, "Quét thành công.");
      } catch (err) {
        return createResponse(false, null, "Lỗi kết nối R2: " + err.message);
      }
    }

    // 2. Thêm Meme mới (Nén WebP và tự động đẩy file lên R2)
    if (action === "add_meme_from_drive") {
      const { image_url, slogan, rarity } = body;
      if (!image_url || !slogan) return createResponse(false, null, "Thiếu thông tin!");

      let finalImageUrl = image_url;

      // Nếu dữ liệu là dạng Base64 từ giao diện kéo thả, chuyển sang WebP và tải lên R2
      if (image_url.startsWith('data:image')) {
        try {
          const matches = image_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) throw new Error('Dữ liệu ảnh không hợp lệ');
          
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `meme_${Date.now()}.webp`; // Lưu ảnh dưới dạng .webp

          // Sử dụng sharp để chuyển đổi và nén ảnh (Chất lượng 80%)
          const webpBuffer = await sharp(buffer)
            .webp({ quality: 80 }) 
            .toBuffer();

          await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: webpBuffer,
            ContentType: 'image/webp' // Đặt Content-Type là webp
          }));

          // Tạo URL cuối cùng để lưu vào Database
          const baseUrl = PUBLIC_URL.replace(/\/$/, "");
          finalImageUrl = `${baseUrl}/${fileName}`;
        } catch (err) {
          return createResponse(false, null, "Lỗi xử lý hoặc upload ảnh lên Cloudflare R2: " + err.message);
        }
      }

      // Lưu URL chuẩn của Cloudflare R2 vào cơ sở dữ liệu Supabase
      const { error } = await supabase.from('meme').insert([{ 
        image: finalImageUrl, 
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
      const requestedPullCount = body.pull_count === "all" ? "all" : Number(body.pull_count || 1);
      const { data: itemData, error: itemErr } = await supabase.from('items').select('coins, total_coins, spent_coins, meme_id_list, gacha_target_meme_id, gacha_target_pull_count, gacha_new_pull_count').eq('student_id', student_id).single();
      if (itemErr || !itemData) return createResponse(false, null, "Không tìm thấy dữ liệu ví của học sinh.");
      
      const currentCoins = itemData.coins !== undefined ? itemData.coins : 100;
      const gachaCost = 30;
      const availablePullCount = Math.floor(currentCoins / gachaCost);
      if (requestedPullCount !== "all" && (!Number.isInteger(requestedPullCount) || requestedPullCount < 1 || requestedPullCount > 10)) {
        return createResponse(false, null, "Số lượt quay không hợp lệ.");
      }
      const pullCount = requestedPullCount === "all" ? availablePullCount : requestedPullCount;
      if (pullCount < 1) return createResponse(false, null, "Bạn không đủ 30 Xu để quay Gacha!");
      if (pullCount > availablePullCount) return createResponse(false, null, `Bạn cần ít nhất ${pullCount * gachaCost} Xu để quay ${pullCount} lần.`);

      const { data: memesList, error: memesError } = await supabase.from('meme').select('id, image, slogan, rarity');
      if (memesError) return createResponse(false, null, "Không thể tải danh sách thẻ để quay thưởng.");
      if (!memesList || memesList.length === 0) return createResponse(false, null, "Hệ thống chưa có dữ liệu meme!");

      const { data: gachaSettings, error: settingsError } = await supabase.from('gacha_settings').select('target_enabled, target_pull_limit_ss, target_pull_limit_s, target_pull_limit_a, target_pull_limit_b, target_pull_limit_c, new_meme_enabled, new_meme_pull_limit').eq('id', 1).maybeSingle();
      if (settingsError) return createResponse(false, null, "Không thể tải quy tắc quay thưởng. Giáo viên cần cập nhật cơ sở dữ liệu gacha_settings.");
      const settings = gachaSettings || {};
      const targetPullLimits = getTargetPullLimits(settings);
      const targetRuleEnabled = settings.target_enabled === true;
      const ownedIds = parseMemeIds(itemData.meme_id_list);
      const ownedIdSet = new Set(ownedIds);
      let targetMemeId = itemData.gacha_target_meme_id === null ? null : Number(itemData.gacha_target_meme_id);
      let targetPullCount = Number(itemData.gacha_target_pull_count) || 0;
      let newPullCount = Number(itemData.gacha_new_pull_count) || 0;
      const newMemeLimit = Number(settings.new_meme_pull_limit);
      const newMemeRuleActive = settings.new_meme_enabled === true && Number.isInteger(newMemeLimit) && newMemeLimit > 0;

      if (targetMemeId !== null && (!memesList.some(meme => Number(meme.id) === targetMemeId) || ownedIdSet.has(targetMemeId))) {
        targetMemeId = null;
      }

      const wonMemes = [];
      for (let pullIndex = 0; pullIndex < pullCount; pullIndex += 1) {
        const currentTarget = targetMemeId === null ? null : memesList.find(meme => Number(meme.id) === targetMemeId);
        const currentTargetLimit = currentTarget ? targetPullLimits[currentTarget.rarity] : null;
        const targetRuleApplies = settings.target_enabled === true && Number.isInteger(currentTargetLimit) && currentTargetLimit > 0;
        const unownedMemes = memesList.filter(meme => !ownedIdSet.has(Number(meme.id)));

        if (targetRuleEnabled) targetPullCount += 1;
        const targetWasReached = targetRuleApplies && targetMemeId !== null && targetPullCount >= currentTargetLimit;
        if (newMemeRuleActive && unownedMemes.length > 0) newPullCount += 1;
        const newMemeWasReached = newMemeRuleActive && unownedMemes.length > 0 && newPullCount >= newMemeLimit;

        let wonMeme;
        if (targetWasReached) {
          wonMeme = currentTarget;
          targetMemeId = null;
          targetPullCount = 0;
        } else if (newMemeWasReached) {
          wonMeme = pickMemeByOriginalRarity(unownedMemes);
        } else {
          wonMeme = pickMemeByOriginalRarity(memesList);
        }

        const isNewMeme = !ownedIdSet.has(Number(wonMeme.id));
        if (!isNewMeme) {
          if (!newMemeRuleActive) newPullCount = Number(itemData.gacha_new_pull_count) || 0;
        } else {
          ownedIdSet.add(Number(wonMeme.id));
          newPullCount = 0;
          if (targetMemeId === Number(wonMeme.id)) targetMemeId = null;
        }
        ownedIds.push(wonMeme.id);
        wonMemes.push({
          ...wonMeme,
          is_new_meme: isNewMeme,
          target_was_reached: targetWasReached,
          new_meme_was_reached: newMemeWasReached && !targetWasReached
        });
      }

      const updatedInventoryIds = ownedIds;
      const totalCost = pullCount * gachaCost;
      const nextSpentCoins = (Number(itemData.spent_coins) || 0) + totalCost;
      const nextTotalCoins = Number(itemData.total_coins) || currentCoins;
      const { error: updateError } = await supabase.from('items').update({
        coins: currentCoins - totalCost,
        spent_coins: nextSpentCoins,
        total_coins: nextTotalCoins,
        meme_id_list: updatedInventoryIds,
        gacha_target_meme_id: targetMemeId,
        gacha_target_pull_count: targetPullCount,
        gacha_new_pull_count: newPullCount
      }).eq('student_id', student_id);
      if (updateError) return createResponse(false, null, "Không thể lưu kết quả quay thưởng.");
      return createResponse(true, {
        coins: currentCoins - totalCost,
        total_coins: nextTotalCoins,
        spent_coins: nextSpentCoins,
        wonMeme: wonMemes[wonMemes.length - 1],
        is_new_meme: wonMemes[wonMemes.length - 1].is_new_meme,
        wonMemes,
        pull_count: pullCount,
        total_cost: totalCost,
        meme_id_list: updatedInventoryIds,
        gacha_target_meme_id: targetMemeId,
        gacha_target_pull_count: targetPullCount,
        gacha_new_pull_count: newPullCount,
        gacha_settings: { ...settings, target_pull_limits: targetPullLimits },
        target_was_reached: wonMemes.some(meme => meme.target_was_reached),
        new_meme_was_reached: wonMemes.some(meme => meme.new_meme_was_reached)
      }, `Quay Gacha thành công ${pullCount} lần!`);
    }

    if (action === "transfer_meme") {
      const { sender_id, recipient_username, meme_id } = body;
      const { data: senderStudent } = await supabase.from('students').select('school').eq('id', sender_id).single();
      const schoolName = senderStudent ? senderStudent.school : null;
      if (schoolName) {
        const { data: schoolStatus } = await supabase.from('schools').select('is_reward_sharing_locked').eq('name', schoolName).single();
        if (schoolStatus && schoolStatus.is_reward_sharing_locked) {
          return createResponse(false, null, "🔒 Chia sẻ phần thưởng đã bị khóa bởi giáo viên. Bạn không thể tặng thẻ cho đến khi tính năng được mở lại!");
        }
      }

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