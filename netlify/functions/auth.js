const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const createResponse = (success, data, message = "") => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success, data, message })
  };
};

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Hàm trích xuất IP Client trên Netlify Functions
const getClientIp = (event) => {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] ? headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    '127.0.0.1'
  );
};

// Hàm nhận diện Thiết bị và Hệ điều hành từ User-Agent
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

// Bộ phân tích mảng Meme an toàn (Phòng tránh lỗi mảng Supabase biến thành chuỗi String)
const parseMemeIds = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(Number);
  if (typeof data === 'string') {
    try {
      return JSON.parse(data).map(Number);
    } catch (e) {
      return data.replace(/[{}[\]"']/g, '').split(',')
                 .map(s => s.trim())
                 .filter(Boolean)
                 .map(Number);
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

      // 0.1 Kiểm tra IP có nằm trong danh sách cấm (Banned IP) không
      const { data: isBanned } = await supabase
        .from('banned_ips')
        .select('ip_address, reason')
        .eq('ip_address', ipAddress)
        .single();

      if (isBanned) {
        return createResponse(
          false, null, `${isBanned.reason}`
        );
      }

      // 0.2 Kiểm tra Tài khoản có nằm trong danh sách cấm (Banned Account) không
      const { data: isAccountBanned } = await supabase
        .from('banned_accounts')
        .select('username, reason')
        .eq('username', username)
        .single();

      if (isAccountBanned) {
        return createResponse(
          false, null, `${isAccountBanned.reason}`
        );
      }

      // 1. Kiểm tra tài khoản Giáo viên (Admin)
      let { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (adminData) {
        await supabase.from('login_history').insert([{
          user_id: adminData.id,
          username: adminData.username,
          role: 'teacher',
          full_name: adminData.full_name || 'Giáo viên',
          ip_address: ipAddress,
          device_name: deviceName
        }]);

        return createResponse(true, {
          id: adminData.id,
          username: adminData.username,
          role: 'teacher',
          adminRole: adminData.role,
          fullName: adminData.full_name
        });
      }

      // 2. Kiểm tra tài khoản Học sinh
      let { data: studentData, error: stuErr } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (stuErr || !studentData) {
        return createResponse(false, null, "Sai tên đăng nhập hoặc mật khẩu!");
      }

      // Ghi lại nhật ký đăng nhập học sinh
      await supabase.from('login_history').insert([{
        user_id: studentData.id,
        username: studentData.username,
        role: 'student',
        full_name: studentData.full_name,
        ip_address: ipAddress,
        device_name: deviceName
      }]);

      return createResponse(true, {
        id: studentData.id,
        username: studentData.username,
        role: 'student',
        fullName: studentData.full_name,
        lastName: studentData.last_name,
        firstName: studentData.first_name,
        className: studentData.class_name,
        school: studentData.school,
        grade: studentData.grade || '7',
        username_change_limit: studentData.username_change_limit !== undefined ? studentData.username_change_limit : 2
      });
    }

    /* QUẢN LÝ LỊCH SỬ ĐĂNG NHẬP */
    if (action === "get_login_history") {
      const limit = body.limit || 100;
      let query = supabase
        .from('login_history')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(limit);

      if (body.role && body.role !== 'ALL') {
        query = query.eq('role', body.role);
      }

      const { data: logs, error } = await query;
      if (error) return createResponse(false, null, "Lỗi khi lấy nhật ký đăng nhập: " + error.message);
      return createResponse(true, { logs: logs || [] });
    }

    /* XÓA NHẬT KÝ CHI TIẾT */
    if (action === "clear_login_history") {
      const { role } = body;
      let query = supabase.from('login_history').delete();
      
      if (role && role !== 'ALL') {
        query = query.eq('role', role);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;
      if (error) return createResponse(false, null, "Lỗi khi xóa nhật ký: " + error.message);
      return createResponse(true, null, "Đã xóa dữ liệu nhật ký thành công!");
    }

    /* XÓA IP RA KHỎI HỆ THỐNG (Xóa lịch sử của IP đó) */
    if (action === "delete_ip_logs") {
      const { ip_address } = body;
      if (!ip_address) return createResponse(false, null, "Thiếu địa chỉ IP cần xóa.");

      const { error } = await supabase
        .from('login_history')
        .delete()
        .eq('ip_address', ip_address);

      if (error) return createResponse(false, null, "Lỗi khi xóa dữ liệu IP: " + error.message);
      return createResponse(true, null, `Đã xóa hoàn toàn dữ liệu của IP ${ip_address}. Khi máy này đăng nhập lại, hệ thống sẽ ghi nhận lại từ đầu.`);
    }

    /* QUẢN LÝ IP & THIẾT BỊ (Gộp nhóm theo IP) */
    if (action === "get_ip_management") {
      const { data: logs, error: logErr } = await supabase
        .from('login_history')
        .select('*')
        .order('login_at', { ascending: false });

      if (logErr) return createResponse(false, null, "Lỗi khi lấy dữ liệu IP.");

      const { data: bannedData } = await supabase.from('banned_ips').select('ip_address, reason');
      const bannedIpsMap = {};
      (bannedData || []).forEach(b => {
        bannedIpsMap[b.ip_address] = b.reason;
      });

      const ipMap = {};
      (logs || []).forEach(log => {
        if (!ipMap[log.ip_address]) {
          ipMap[log.ip_address] = {
            ip_address: log.ip_address,
            accounts: new Set(),
            devices: new Set(),
            last_login: log.login_at,
            is_banned: !!bannedIpsMap[log.ip_address],
            ban_reason: bannedIpsMap[log.ip_address] || ""
          };
        }
        ipMap[log.ip_address].accounts.add(`${log.username} (${log.role === 'teacher' ? 'GV' : 'HS'})`);
        ipMap[log.ip_address].devices.add(log.device_name || "Không xác định");
      });

      const ipList = Object.values(ipMap).map(item => ({
        ...item,
        accounts: Array.from(item.accounts),
        devices: Array.from(item.devices)
      }));

      return createResponse(true, { ip_list: ipList });
    }

    /* KHÓA VÀ MỞ KHÓA TÀI KHOẢN (BAN ACCOUNT) */
    if (action === "ban_account") {
      const { username, reason } = body;
      if (!username) return createResponse(false, null, "Thiếu tên tài khoản.");

      const { error } = await supabase.from('banned_accounts').insert([{ 
        username, 
        reason: reason || "Vi phạm quy chế"
      }]);

      if (error) {
        if (error.code === '23505') return createResponse(false, null, "Tài khoản này đã bị khóa từ trước!");
        return createResponse(false, null, "Lỗi khi khóa tài khoản.");
      }
      return createResponse(true, null, `Đã khóa tài khoản ${username}!`);
    }

    if (action === "unban_account") {
      const { username } = body;
      if (!username) return createResponse(false, null, "Thiếu tên tài khoản.");

      const { error } = await supabase.from('banned_accounts').delete().eq('username', username);
      if (error) return createResponse(false, null, "Lỗi mở khóa tài khoản.");
      return createResponse(true, null, `Đã mở khóa truy cập cho tài khoản ${username}.`);
    }

    /* KHÓA VÀ MỞ KHÓA IP (BAN IP) */
    if (action === "ban_ip") {
      const { ip_address, reason } = body;
      if (!ip_address) return createResponse(false, null, "Thiếu địa chỉ IP.");

      const { error } = await supabase.from('banned_ips').insert([{ 
        ip_address, 
        reason: reason || "Vi phạm quy chế"
      }]);

      if (error) {
        if (error.code === '23505') return createResponse(false, null, "IP này đã bị khóa từ trước!");
        return createResponse(false, null, "Lỗi khi khóa IP.");
      }
      return createResponse(true, null, `Đã khóa vĩnh viễn IP ${ip_address}!`);
    }

    if (action === "unban_ip") {
      const { ip_address } = body;
      if (!ip_address) return createResponse(false, null, "Thiếu địa chỉ IP.");

      const { error } = await supabase.from('banned_ips').delete().eq('ip_address', ip_address);
      if (error) return createResponse(false, null, "Lỗi mở khóa IP.");
      return createResponse(true, null, `Đã mở khóa truy cập cho IP ${ip_address}.`);
    }

    if (action === "get_student_scores") {
      const { data, error } = await supabase.from('scores').select('*').eq('student_id', body.id).single();
      if (error || !data) return createResponse(false, null, "Chưa có bảng điểm.");
      return createResponse(true, {
        scores: [data.score_1, data.score_2, data.score_3, data.score_4, data.score_5].map(s => s === null ? "" : s),
        feedback: data.feedback || ""
      });
    }

    if (action === "save_feedback") {
      const { student_id, feedback } = body;
      if (!student_id) return createResponse(false, null, "Thiếu mã học sinh!");

      const { error } = await supabase
        .from('scores')
        .update({ feedback: feedback || "" })
        .eq('student_id', student_id);

      if (error) return createResponse(false, null, "Lỗi khi lưu đánh giá: " + error.message);
      return createResponse(true, null, "Lưu đánh giá học sinh thành công!");
    }

    if (action === "get_student_info") {
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', body.id)
        .single();

      if (error || !student) return createResponse(false, null, "Không tìm thấy học sinh.");

      let { data: itemData } = await supabase
        .from('items')
        .select('coins, total_coins, spent_coins, meme_id_list, pending_coins')
        .eq('student_id', body.id)
        .single();

      if (!itemData) {
        await supabase.from('items').insert([{
          student_id: body.id,
          coins: 100,
          total_coins: 100,
          spent_coins: 0,
          pending_coins: 0,
          meme_id_list: []
        }]);
        itemData = { coins: 100, total_coins: 100, spent_coins: 0, pending_coins: 0, meme_id_list: [] };
      }

      return createResponse(true, {
        ...student,
        grade: student.grade || '7',
        username_change_limit: student.username_change_limit !== undefined ? student.username_change_limit : 2,
        coins: itemData.coins !== undefined ? itemData.coins : 100,
        total_coins: itemData.total_coins !== undefined ? itemData.total_coins : 100,
        spent_coins: itemData.spent_coins !== undefined ? itemData.spent_coins : 0,
        pending_coins: itemData.pending_coins !== undefined ? itemData.pending_coins : 0,
        meme_id_list: parseMemeIds(itemData.meme_id_list)
      });
    }

    /* HỌC SINH YÊU CẦU NHẬN XU PHÁT BIỂU */
    if (action === "request_reward_coins") {
      const { student_id, requested_coins } = body;
      const coinsNum = parseInt(requested_coins, 10);

      if (!student_id || isNaN(coinsNum) || coinsNum <= 0) {
        return createResponse(false, null, "Số xu yêu cầu không hợp lệ!");
      }

      const { data: itemData } = await supabase
        .from('items')
        .select('pending_coins')
        .eq('student_id', student_id)
        .single();

      const curPending = itemData && itemData.pending_coins !== undefined ? Number(itemData.pending_coins) : 0;
      const newPending = curPending + coinsNum;

      const { error } = await supabase
        .from('items')
        .update({ pending_coins: newPending })
        .eq('student_id', student_id);

      if (error) {
        return createResponse(false, null, "Lỗi khi gửi yêu cầu nhận xu: " + error.message);
      }

      return createResponse(true, { pending_coins: newPending }, `Đã gửi yêu cầu cộng ${coinsNum} xu đến giáo viên!`);
    }

    /* GIÁO VIÊN: LẤY DANH SÁCH HỌC SINH CHỜ DUYỆT THƯỞNG XU */
    if (action === "get_pending_rewards") {
      const { data, error } = await supabase
        .from('items')
        .select(`
          pending_coins,
          student_id,
          students (id, full_name, username, class_name, school)
        `)
        .gt('pending_coins', 0);

      if (error) {
        return createResponse(false, null, "Lỗi lấy danh sách duyệt thưởng: " + error.message);
      }

      const requests = (data || []).map(row => ({
        student_id: row.student_id,
        pending_coins: row.pending_coins,
        full_name: row.students ? row.students.full_name : "",
        username: row.students ? row.students.username : "",
        class_name: row.students ? row.students.class_name : "",
        school: row.students ? row.students.school : ""
      }));

      return createResponse(true, { requests });
    }

    /* GIÁO VIÊN: DUYỆT TỪNG NGƯỜI */
    if (action === "approve_reward") {
      const { student_id } = body;
      if (!student_id) return createResponse(false, null, "Thiếu mã học sinh!");

      const { data: itemData, error: itemErr } = await supabase
        .from('items')
        .select('coins, total_coins, pending_coins')
        .eq('student_id', student_id)
        .single();

      if (itemErr || !itemData) {
        return createResponse(false, null, "Không tìm thấy dữ liệu xu của học sinh!");
      }

      const pending = Number(itemData.pending_coins) || 0;
      if (pending <= 0) {
        return createResponse(false, null, "Học sinh không có xu nào chờ duyệt!");
      }

      const curCoins = Number(itemData.coins) || 0;
      const curTotal = Number(itemData.total_coins) || 0;

      const { error: updateErr } = await supabase
        .from('items')
        .update({
          coins: curCoins + pending,
          total_coins: curTotal + pending,
          pending_coins: 0
        })
        .eq('student_id', student_id);

      if (updateErr) {
        return createResponse(false, null, "Lỗi khi duyệt cộng xu: " + updateErr.message);
      }

      return createResponse(true, null, `Đã duyệt và cộng thành công ${pending} xu cho học sinh!`);
    }

    /* GIÁO VIÊN: DUYỆT TẤT CẢ */
    if (action === "approve_all_rewards") {
      const { student_ids } = body;
      let query = supabase.from('items').select('student_id, coins, total_coins, pending_coins').gt('pending_coins', 0);

      if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
        query = query.in('student_id', student_ids);
      }

      const { data: itemsList, error: fetchErr } = await query;
      if (fetchErr) {
        return createResponse(false, null, "Lỗi khi truy vấn danh sách chờ: " + fetchErr.message);
      }

      if (!itemsList || itemsList.length === 0) {
        return createResponse(false, null, "Không có yêu cầu nào cần duyệt!");
      }

      const updatePromises = itemsList.map(item => {
        const pending = Number(item.pending_coins) || 0;
        const curCoins = Number(item.coins) || 0;
        const curTotal = Number(item.total_coins) || 0;

        return supabase
          .from('items')
          .update({
            coins: curCoins + pending,
            total_coins: curTotal + pending,
            pending_coins: 0
          })
          .eq('student_id', item.student_id);
      });

      await Promise.all(updatePromises);
      return createResponse(true, null, `Đã duyệt tất cả yêu cầu nhận xu cho ${itemsList.length} học sinh thành công!`);
    }

    if (action === "student_change_password") {
      const { student_id, old_password, new_password } = body;

      if (!student_id || old_password === undefined || new_password === undefined || new_password === "") {
        return createResponse(false, null, "Vui lòng nhập đầy đủ thông tin mật khẩu!");
      }

      const { data: student, error: fetchErr } = await supabase
        .from('students')
        .select('password')
        .eq('id', student_id)
        .single();

      if (fetchErr || !student) {
        return createResponse(false, null, "Không tìm thấy thông tin tài khoản!");
      }

      if (student.password !== old_password.trim()) {
        return createResponse(false, null, "Mật khẩu hiện tại không chính xác!");
      }

      const { error: updateErr } = await supabase
        .from('students')
        .update({ password: new_password.trim() })
        .eq('id', student_id);

      if (updateErr) {
        return createResponse(false, null, "Lỗi khi cập nhật mật khẩu: " + updateErr.message);
      }

      return createResponse(true, null, "Đổi mật khẩu thành công!");
    }

    if (action === "student_change_username") {
      const { student_id, password, new_username } = body;

      if (!student_id || !password || !new_username) {
        return createResponse(false, null, "Vui lòng nhập đầy đủ thông tin!");
      }

      const cleanUsername = new_username.trim().toLowerCase();

      if (!/^[a-z0-9_.]{3,30}$/.test(cleanUsername)) {
        return createResponse(false, null, "Tên tài khoản từ 3-30 ký tự (chữ thường, số, dấu chấm hoặc gạch dưới)!");
      }

      const { data: student, error: fetchErr } = await supabase
        .from('students')
        .select('password, username_change_limit, username')
        .eq('id', student_id)
        .single();

      if (fetchErr || !student) {
        return createResponse(false, null, "Không tìm thấy học sinh!");
      }

      if (student.password !== password.trim()) {
        return createResponse(false, null, "Mật khẩu xác nhận không chính xác!");
      }

      const currentLimit = student.username_change_limit !== undefined ? student.username_change_limit : 2;
      if (currentLimit <= 0) {
        return createResponse(false, null, "Bạn đã hết số lần được phép đổi tên tài khoản (Tối đa 2 lần)!");
      }

      if (cleanUsername === (student.username || '').toLowerCase()) {
        return createResponse(false, null, "Tên tài khoản mới trùng với tên hiện tại!");
      }

      const { data: existStudent } = await supabase
        .from('students')
        .select('id')
        .eq('username', cleanUsername)
        .single();

      const { data: existAdmin } = await supabase
        .from('admins')
        .select('id')
        .eq('username', cleanUsername)
        .single();

      if (existStudent || existAdmin) {
        return createResponse(false, null, "Tên tài khoản này đã có người sử dụng, vui lòng chọn tên khác!");
      }

      const newLimit = currentLimit - 1;
      const { error: updateErr } = await supabase
        .from('students')
        .update({
          username: cleanUsername,
          username_change_limit: newLimit
        })
        .eq('id', student_id);

      if (updateErr) {
        return createResponse(false, null, "Lỗi cập nhật tên tài khoản: " + updateErr.message);
      }

      return createResponse(true, {
        new_username: cleanUsername,
        remaining_limit: newLimit
      }, `Đổi tên tài khoản thành công! Bạn còn ${newLimit} lần đổi.`);
    }

    if (action === "update_student_items") {
      const { student_id, coins, total_coins, spent_coins, meme_id_list } = body;
      const updatePayload = {};
      if (coins !== undefined) updatePayload.coins = coins;
      if (total_coins !== undefined) updatePayload.total_coins = total_coins;
      if (spent_coins !== undefined) updatePayload.spent_coins = spent_coins;
      if (meme_id_list !== undefined) updatePayload.meme_id_list = parseMemeIds(meme_id_list);

      const { error } = await supabase
        .from('items')
        .update(updatePayload)
        .eq('student_id', student_id);

      if (error) return createResponse(false, null, "Lỗi cập nhật dữ liệu xu và meme.");
      return createResponse(true, null, "Cập nhật thành công!");
    }

    if (action === "get_all_memes") {
      let { data: memes, error } = await supabase.from('meme').select('*');
      if (error) return createResponse(false, null, "Lỗi lấy danh sách meme.");
      return createResponse(true, { memes: memes || [] });
    }

    if (action === "add_meme") {
      const { image, slogan } = body;
      let rarity = body.rarity ? body.rarity.trim().split(" ")[0] : "C";

      if (!image || !slogan) {
        return createResponse(false, null, "Vui lòng nhập đầy đủ thông tin ảnh và slogan!");
      }

      const { error } = await supabase.from('meme').insert([{
        image, slogan, rarity
      }]);

      if (error) return createResponse(false, null, "Lỗi lưu meme vào cơ sở dữ liệu: " + error.message);
      return createResponse(true, null, "Thêm phần thưởng Meme thành công!");
    }

    if (action === "update_meme") {
      const { id, old_slogan, slogan, rarity } = body;
      let parsedRarity = rarity ? rarity.trim().split(" ")[0] : "C";

      if (!slogan) {
        return createResponse(false, null, "Slogan không được để trống!");
      }

      let query = supabase.from('meme').update({
        slogan: slogan.trim(),
        rarity: parsedRarity
      });

      if (id) {
        query = query.eq('id', id);
      } else if (old_slogan) {
        query = query.eq('slogan', old_slogan);
      } else {
        return createResponse(false, null, "Không xác định được meme cần sửa!");
      }

      const { error } = await query;
      if (error) return createResponse(false, null, "Lỗi cập nhật thông tin meme: " + error.message);
      return createResponse(true, null, "Cập nhật meme thành công!");
    }

    if (action === "delete_meme") {
      const { id, slogan } = body;

      let query = supabase.from('meme').delete();

      if (id) {
        query = query.eq('id', id);
      } else if (slogan) {
        query = query.eq('slogan', slogan);
      } else {
        return createResponse(false, null, "Không xác định được meme cần xóa!");
      }

      const { error } = await query;
      if (error) return createResponse(false, null, "Lỗi xóa meme khỏi hệ thống: " + error.message);
      return createResponse(true, null, "Đã xóa meme thành công!");
    }

    if (action === "pull_gacha") {
      const { student_id } = body;
      
      let { data: itemData, error: itemErr } = await supabase
        .from('items')
        .select('coins, total_coins, spent_coins, meme_id_list')
        .eq('student_id', student_id)
        .single();

      if (itemErr || !itemData) return createResponse(false, null, "Không tìm thấy dữ liệu ví của học sinh.");
      
      const currentCoins = itemData.coins !== undefined ? itemData.coins : 100;
      const currentSpent = itemData.spent_coins !== undefined ? itemData.spent_coins : 0;
      const currentTotal = itemData.total_coins !== undefined ? itemData.total_coins : currentCoins;
      const gachaCost = 30;

      if (currentCoins < gachaCost) {
        return createResponse(false, null, "Bạn không đủ 30 Xu để quay Gacha!");
      }

      let { data: memesList, error: memeErr } = await supabase.from('meme').select('*');
      if (memeErr || !memesList || memesList.length === 0) {
        return createResponse(false, null, "Hệ thống chưa có dữ liệu meme để quay Gacha!");
      }

      const poolSS = memesList.filter(m => m.rarity === 'SS');
      const poolS = memesList.filter(m => m.rarity === 'S');
      const poolA = memesList.filter(m => m.rarity === 'A');
      const poolB = memesList.filter(m => m.rarity === 'B');
      const poolC = memesList.filter(m => m.rarity === 'C');

      const roll = Math.random() * 100;
      let selectedPool = [];
      
      if (roll < 1 && poolSS.length > 0) selectedPool = poolSS;
      else if (roll < 6 && poolS.length > 0) selectedPool = poolS;
      else if (roll < 16 && poolA.length > 0) selectedPool = poolA;
      else if (roll < 46 && poolB.length > 0) selectedPool = poolB;
      else selectedPool = poolC.length > 0 ? poolC : memesList;

      if (selectedPool.length === 0) selectedPool = memesList;

      const randomMeme = selectedPool[Math.floor(Math.random() * selectedPool.length)];

      const newCoins = currentCoins - gachaCost;
      const newSpent = currentSpent + gachaCost;
      
      const currentInventoryIds = parseMemeIds(itemData.meme_id_list);
      
      let updatedInventoryIds = [...currentInventoryIds];
      updatedInventoryIds.push(randomMeme.id);

      const { error: updateErr } = await supabase
        .from('items')
        .update({
          coins: newCoins,
          spent_coins: newSpent,
          total_coins: currentTotal,
          meme_id_list: updatedInventoryIds
        })
        .eq('student_id', student_id);

      if (updateErr) return createResponse(false, null, "Lỗi kết quả quay Gacha.");

      return createResponse(true, {
        coins: newCoins,
        total_coins: currentTotal,
        spent_coins: newSpent,
        wonMeme: randomMeme,
        meme_id_list: updatedInventoryIds
      }, "Quay Gacha thành công!");
    }

    if (action === "transfer_meme") {
      const { sender_id, recipient_username, meme_id } = body;

      if (!sender_id || !recipient_username || !meme_id) {
        return createResponse(false, null, "Vui lòng cung cấp đầy đủ thông tin gửi tặng thẻ!");
      }

      const cleanUsername = recipient_username.trim().toLowerCase();

      const { data: recipient, error: recipErr } = await supabase
        .from('students')
        .select('id, full_name, username')
        .ilike('username', cleanUsername)
        .single();

      if (recipErr || !recipient) {
        return createResponse(false, null, `Không tìm thấy bạn học có tài khoản "${recipient_username}"!`);
      }

      if (recipient.id === sender_id) {
        return createResponse(false, null, "Bạn không thể tự tặng thẻ cho chính mình!");
      }

      const { data: senderItems, error: senderErr } = await supabase
        .from('items')
        .select('meme_id_list')
        .eq('student_id', sender_id)
        .single();

      if (senderErr || !senderItems) {
        return createResponse(false, null, "Không tìm thấy dữ liệu kho thẻ của bạn!");
      }

      const parsedMemeId = Number(meme_id);
      const senderList = parseMemeIds(senderItems.meme_id_list);
      const occurrences = senderList.filter(id => id === parsedMemeId).length;

      if (occurrences < 2) {
        return createResponse(false, null, "Bạn cần sở hữu từ 2 thẻ trở lên mới có thể tặng thẻ dư!");
      }

      let { data: recipItems } = await supabase
        .from('items')
        .select('meme_id_list')
        .eq('student_id', recipient.id)
        .single();

      let recipList = [];
      if (!recipItems) {
        await supabase.from('items').insert([{
          student_id: recipient.id,
          coins: 100,
          total_coins: 100,
          spent_coins: 0,
          meme_id_list: []
        }]);
      } else {
        recipList = parseMemeIds(recipItems.meme_id_list);
      }

      const removeIndex = senderList.findIndex(id => id === parsedMemeId);
      if (removeIndex > -1) {
        senderList.splice(removeIndex, 1);
      }
      recipList.push(parsedMemeId);

      const { error: updateSenderErr } = await supabase
        .from('items')
        .update({ meme_id_list: senderList })
        .eq('student_id', sender_id);

      if (updateSenderErr) {
        return createResponse(false, null, "Lỗi cập nhật thẻ người gửi: " + updateSenderErr.message);
      }

      const { error: updateRecipErr } = await supabase
        .from('items')
        .update({ meme_id_list: recipList })
        .eq('student_id', recipient.id);

      if (updateRecipErr) {
        return createResponse(false, null, "Lỗi chuyển thẻ tới người nhận: " + updateRecipErr.message);
      }

      return createResponse(true, {
        updated_meme_id_list: senderList,
        recipient_name: recipient.full_name || recipient.username
      }, `Đã tặng thành công 1 thẻ cho bạn ${recipient.full_name || recipient.username}!`);
    }

    if (action === "get_students") {
      let query = supabase.from('students').select(`
        id, full_name, last_name, first_name, class_name, username, password, grade,
        scores (score_1, score_2, score_3, score_4, score_5, feedback),
        items (coins, total_coins, spent_coins, meme_id_list)
      `).eq('school', body.school);

      if (body.className) query = query.eq('class_name', body.className.trim().toUpperCase());

      const { data, error } = await query;
      if (error) throw error;

      const { data: bannedAccounts } = await supabase.from('banned_accounts').select('username');
      const bannedSet = new Set((bannedAccounts || []).map(b => b.username));

      const students = data.map(row => {
        let totalScore = 0, countScore = 0;
        const s = row.scores || {};
        [s.score_1, s.score_2, s.score_3, s.score_4, s.score_5].forEach(val => {
          if (val !== null && val !== undefined) {
            totalScore += Number(val);
            countScore++;
          }
        });
        const avgScore = countScore > 0 ? (totalScore / countScore).toFixed(1) : 0;
        const studentItems = row.items || {};

        return {
          id: row.id, 
          fullName: row.full_name, 
          lastName: row.last_name,
          firstName: row.first_name, 
          className: row.class_name,
          grade: row.grade || '7',
          username: row.username, 
          password: row.password, 
          feedback: s.feedback || "",
          coins: studentItems.coins !== undefined ? studentItems.coins : 100,
          total_coins: studentItems.total_coins !== undefined ? studentItems.total_coins : 100,
          spent_coins: studentItems.spent_coins !== undefined ? studentItems.spent_coins : 0,
          meme_id_list: parseMemeIds(studentItems.meme_id_list),
          score: `${avgScore} / ${totalScore}`,
          is_banned: bannedSet.has(row.username)
        };
      });
      return createResponse(true, { students });
    }

    if (action === "update_student") {
      const { student_id, lastName, firstName, className, password, coin_delta } = body;

      if (!student_id) {
        return createResponse(false, null, "Thiếu mã học sinh!");
      }

      const formattedLastName = capitalizeWords(lastName);
      const formattedFirstName = capitalizeWords(firstName);
      const fullName = `${formattedLastName} ${formattedFirstName}`.trim();

      const studentUpdatePayload = {
        last_name: formattedLastName,
        first_name: formattedFirstName,
        full_name: fullName,
        class_name: className ? className.trim().toUpperCase() : ""
      };

      if (password && password.trim()) {
        studentUpdatePayload.password = password.trim();
      }

      const { error: updateStuErr } = await supabase
        .from('students')
        .update(studentUpdatePayload)
        .eq('id', student_id);

      if (updateStuErr) {
        return createResponse(false, null, "Lỗi cập nhật học sinh: " + updateStuErr.message);
      }

      const delta = Number(coin_delta) || 0;
      if (delta !== 0) {
        const { data: itemData } = await supabase
          .from('items')
          .select('coins, total_coins')
          .eq('student_id', student_id)
          .single();

        let curCoins = itemData && itemData.coins !== undefined ? Number(itemData.coins) : 100;
        let curTotal = itemData && itemData.total_coins !== undefined ? Number(itemData.total_coins) : curCoins;

        let newCoins = curCoins + delta;
        if (newCoins < 0) newCoins = 0;

        let newTotal = curTotal + delta;
        if (newTotal < 0) newTotal = 0;

        await supabase
          .from('items')
          .update({
            coins: newCoins,
            total_coins: newTotal
          })
          .eq('student_id', student_id);
      }

      return createResponse(true, null, "Cập nhật thông tin học sinh thành công!");
    }

    /* CẬP NHẬT XU HÀNG LOẠT (CẢ LỚP) */
    if (action === "batch_update_coins") {
      const { student_ids, coin_delta } = body;
      
      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return createResponse(false, null, "Không có học sinh nào để cập nhật xu!");
      }
      
      const delta = Number(coin_delta);
      if (isNaN(delta) || delta === 0) {
        return createResponse(false, null, "Số lượng xu không hợp lệ!");
      }

      const { data: itemsData, error: itemsErr } = await supabase
        .from('items')
        .select('student_id, coins, total_coins')
        .in('student_id', student_ids);

      if (itemsErr) {
        return createResponse(false, null, "Lỗi khi truy xuất dữ liệu xu: " + itemsErr.message);
      }

      const itemMap = {};
      (itemsData || []).forEach(it => {
        itemMap[it.student_id] = it;
      });

      const updatePromises = student_ids.map(sid => {
        const it = itemMap[sid];
        let curCoins = it && it.coins !== undefined ? Number(it.coins) : 100;
        let curTotal = it && it.total_coins !== undefined ? Number(it.total_coins) : curCoins;

        let newCoins = curCoins + delta;
        if (newCoins < 0) newCoins = 0;
        
        let newTotal = curTotal + delta;
        if (newTotal < 0) newTotal = 0;

        return supabase
          .from('items')
          .update({ coins: newCoins, total_coins: newTotal })
          .eq('student_id', sid);
      });

      await Promise.all(updatePromises);

      return createResponse(true, null, `Đã cập nhật xu cho ${student_ids.length} học sinh thành công!`);
    }

    if (action === "batch_update_class") {
      const { student_ids, new_class } = body;

      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return createResponse(false, null, "Vui lòng chọn ít nhất một học sinh để chuyển lớp!");
      }
      if (!new_class || new_class.trim() === "") {
        return createResponse(false, null, "Vui lòng nhập tên lớp mới!");
      }

      const formattedNewClass = new_class.trim().toUpperCase();

      const { error: updateErr } = await supabase
        .from('students')
        .update({ class_name: formattedNewClass })
        .in('id', student_ids);

      if (updateErr) {
        return createResponse(false, null, "Lỗi khi chuyển lớp: " + updateErr.message);
      }

      return createResponse(true, null, `Đã chuyển thành công ${student_ids.length} học sinh sang lớp ${formattedNewClass}!`);
    }

    if (action === "delete_student") {
      const { student_id, teacher_username, password } = body;

      if (!student_id || !teacher_username || !password) {
        return createResponse(false, null, "Vui lòng nhập đầy đủ thông tin xác thực và mã học sinh!");
      }

      const { data: adminData, error: adminErr } = await supabase
        .from('admins')
        .select('id, username')
        .eq('username', teacher_username)
        .eq('password', password)
        .single();

      if (adminErr || !adminData) {
        return createResponse(false, null, "Mật khẩu xác nhận không chính xác!");
      }

      await supabase.from('scores').delete().eq('student_id', student_id);
      await supabase.from('items').delete().eq('student_id', student_id);

      const { error: deleteStuErr } = await supabase
        .from('students')
        .delete()
        .eq('id', student_id);

      if (deleteStuErr) {
        return createResponse(false, null, "Lỗi khi xóa học sinh: " + deleteStuErr.message);
      }

      return createResponse(true, null, "Đã xóa học sinh thành công!");
    }

    /* XÓA HỌC SINH HÀNG LOẠT (XÓA NHANH) */
    if (action === "batch_delete_students") {
      const { student_ids, teacher_username, password } = body;

      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0 || !teacher_username || !password) {
        return createResponse(false, null, "Vui lòng nhập đầy đủ thông tin xác thực và chọn học sinh cần xóa!");
      }

      const { data: adminData, error: adminErr } = await supabase
        .from('admins')
        .select('id, username')
        .eq('username', teacher_username)
        .eq('password', password)
        .single();

      if (adminErr || !adminData) {
        return createResponse(false, null, "Mật khẩu xác nhận không chính xác!");
      }

      await supabase.from('scores').delete().in('student_id', student_ids);
      await supabase.from('items').delete().in('student_id', student_ids);

      const { error: deleteStuErr } = await supabase
        .from('students')
        .delete()
        .in('id', student_ids);

      if (deleteStuErr) {
        return createResponse(false, null, "Lỗi khi xóa học sinh: " + deleteStuErr.message);
      }

      return createResponse(true, null, `Đã xóa thành công ${student_ids.length} học sinh khỏi hệ thống!`);
    }

    /* TẠO TÀI KHOẢN HÀNG LOẠT */
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
          username_change_limit: 2
        }]).select().single();

        if (userErr) throw userErr;

        await supabase.from('scores').insert([{ student_id: newUser.id, feedback: "" }]);
        await supabase.from('items').insert([{
          student_id: newUser.id,
          coins: startingCoins,
          total_coins: startingCoins,
          spent_coins: 0,
          pending_coins: 0,
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
        username_change_limit: 2
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
        .select('*')
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

    return createResponse(false, null, "Hành động không hợp lệ.");
  } catch (err) {
    return createResponse(false, null, "Lỗi Server: " + err.message);
  }
};