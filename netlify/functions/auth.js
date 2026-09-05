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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('schools').select('name, is_hidden, is_exam_locked');
      if (error) throw error;
      return createResponse(true, { schools: data || [] });
    }

    const body = JSON.parse(event.body || "{}");
    const action = body.action || "login";

    if (action === "login") {
      const username = body.username.trim();
      const password = body.password.trim();

      let { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (adminData) {
        return createResponse(true, {
          id: adminData.id,
          username: adminData.username,
          role: 'teacher',
          adminRole: adminData.role,
          fullName: adminData.full_name
        });
      }

      let { data: studentData, error: stuErr } = await supabase
        .from('students')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (stuErr || !studentData) {
        return createResponse(false, null, "Sai tên đăng nhập hoặc mật khẩu!");
      }

      return createResponse(true, {
        id: studentData.id,
        username: studentData.username,
        role: 'student',
        fullName: studentData.full_name,
        lastName: studentData.last_name,
        firstName: studentData.first_name,
        className: studentData.class_name,
        school: studentData.school
      });
    }

    if (action === "get_student_scores") {
      const { data, error } = await supabase.from('scores').select('*').eq('student_id', body.id).single();
      if (error || !data) return createResponse(false, null, "Chưa có bảng điểm.");
      return createResponse(true, {
        scores: [data.score_1, data.score_2, data.score_3, data.score_4, data.score_5].map(s => s === null ? "" : s)
      });
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
        .select('coins, items')
        .eq('student_id', body.id)
        .single();

      if (!itemData) {
        await supabase.from('items').insert([{ student_id: body.id, coins: 100, items: [] }]);
        itemData = { coins: 100, items: [] };
      }

      return createResponse(true, {
        ...student,
        coins: itemData.coins !== undefined ? itemData.coins : 100,
        inventory: itemData.items || []
      });
    }

    if (action === "update_student_items") {
      const { student_id, coins, items } = body;
      const updatePayload = {};
      if (coins !== undefined) updatePayload.coins = coins;
      if (items !== undefined) updatePayload.items = items;

      const { error } = await supabase
        .from('items')
        .update(updatePayload)
        .eq('student_id', student_id);

      if (error) return createResponse(false, null, "Lỗi cập nhật dữ liệu xu và vật phẩm.");
      return createResponse(true, null, "Cập nhật thành công!");
    }

    if (action === "get_students") {
      let query = supabase.from('students').select(`
        id, full_name, last_name, first_name, class_name, username, password,
        scores (score_1, score_2, score_3, score_4, score_5),
        items (coins, items)
      `).eq('school', body.school);

      if (body.className) query = query.eq('class_name', body.className.trim().toUpperCase());

      const { data, error } = await query;
      if (error) throw error;

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
          username: row.username, 
          password: row.password, 
          coins: studentItems.coins !== undefined ? studentItems.coins : 100,
          inventory: studentItems.items || [],
          score: `${avgScore} / ${totalScore}`
        };
      });
      return createResponse(true, { students });
    }

    if (action === "create_student") {
      const { school } = body;
      const lastName = capitalizeWords(body.lastName);
      const firstName = capitalizeWords(body.firstName);
      const className = body.className ? body.className.trim().toUpperCase() : "";
      const username = body.username ? body.username.trim() : "";
      const password = body.password ? body.password.trim() : "";
      const fullName = `${lastName} ${firstName}`.trim();
      
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
        last_name: lastName, first_name: firstName, class_name: className, school
      }]).select().single();

      if (userErr) {
        if (userErr.code === '23505') return createResponse(false, null, "Tài khoản đã tồn tại trong hệ thống!");
        throw userErr;
      }

      await supabase.from('scores').insert([{ student_id: newUser.id }]);
      await supabase.from('items').insert([{ student_id: newUser.id, coins: 100, items: [] }]);

      return createResponse(true, {
        id: newUser.id, fullName: newUser.full_name, lastName: newUser.last_name,
        firstName: newUser.first_name, className: newUser.className,
        username: newUser.username, school: newUser.school
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

    // --- QUẢN LÝ KHÓA BÀI THI THEO TRƯỜNG ---
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