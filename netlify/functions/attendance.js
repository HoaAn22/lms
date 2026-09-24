const { createClient } = require('@supabase/supabase-js');

let supabase = null;

exports.handler = async (event) => {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, body: JSON.stringify({ message: "Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_KEY" }) };
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  const method = event.httpMethod;

  // 1. XỬ LÝ GHI NHẬN ĐIỂM DANH (POST)
  if (method === 'POST') {
    try {
      const bodyObj = JSON.parse(event.body);
      const action = bodyObj.action;

      // --- A1. GIÁO VIÊN ĐIỂM DANH CẢ LỚP (Bỏ qua lịch hạn chế) ---
      if (action === 'batch_attendance') {
        const { school, class_name, date, students } = bodyObj;
        const nowTime = new Date().toISOString();
        
        await supabase.from('attendance').delete()
          .eq('school', school).eq('class_name', class_name).eq('date', date);

        const insertData = students.map(stu => ({
          student_id: stu.student_id,
          student_name: stu.student_name,
          school,
          class_name,
          date,
          checkin_time: nowTime
        }));

        const { error } = await supabase.from('attendance').insert(insertData);
        if (error) throw error;
        
        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Đã đánh dấu có mặt cho toàn bộ lớp!" }) };
      }

      // --- A2. GIÁO VIÊN HỦY ĐIỂM DANH CẢ LỚP ---
      if (action === 'batch_cancel_attendance') {
        const { school, class_name, date } = bodyObj;
        const { error } = await supabase.from('attendance').delete()
          .eq('school', school).eq('class_name', class_name).eq('date', date);
        
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Đã hủy điểm danh cả lớp (Chuyển thành Vắng)!" }) };
      }

      // --- A3. GIÁO VIÊN ĐIỂM DANH TỪNG HỌC SINH (Bỏ qua lịch hạn chế) ---
      if (action === 'teacher_mark_single') {
        const { school, class_name, date, student_id, student_name } = bodyObj;
        const { error } = await supabase.from('attendance').insert([{ 
          student_id, 
          student_name, 
          school, 
          class_name, 
          date, 
          checkin_time: new Date().toISOString() 
        }]);
        
        if (error && error.code !== '23505') throw error; 
        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Đã đánh dấu có mặt!" }) };
      }

      // --- A4. GIÁO VIÊN HỦY ĐIỂM DANH TỪNG HỌC SINH ---
      if (action === 'cancel_single_attendance') {
        const { school, class_name, date, student_id } = bodyObj;
        const { error } = await supabase.from('attendance').delete()
          .eq('school', school).eq('class_name', class_name).eq('date', date).eq('student_id', student_id);
        
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Đã hủy điểm danh!" }) };
      }

      // --- B. HỌC SINH TỰ ĐIỂM DANH (CÓ KIỂM TRA LỊCH) ---
      const { student_id, student_name, school, class_name } = bodyObj;
      const now = new Date();
      const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const currentDayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay();

      const { data: schedule } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('school', school)
        .eq('class_name', class_name)
        .maybeSingle();

      if (!schedule || !schedule.schedule_days || schedule.schedule_days.length === 0) {
        return { statusCode: 403, body: JSON.stringify({ success: false, message: "GV chưa cho phép điểm danh" }) };
      }

      if (schedule.is_locked || !schedule.schedule_days.includes(currentDayOfWeek)) {
        return { statusCode: 403, body: JSON.stringify({ success: false, message: "GV chưa cho phép điểm danh" }) };
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert([{ 
          student_id, 
          student_name, 
          school, 
          class_name, 
          date: today,
          checkin_time: new Date().toISOString()
        }])
        .select();

      if (error) {
        if (error.code === '23505') {
          return { statusCode: 400, body: JSON.stringify({ success: false, message: "Bạn đã điểm danh buổi học hôm nay rồi!" }) };
        }
        throw error;
      }

      return { statusCode: 200, body: JSON.stringify({ success: true, message: "Điểm danh thành công!", data }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: err.message }) };
    }
  }

  // 2. GIÁO VIÊN TRA CỨU & CẤU HÌNH (GET)
  if (method === 'GET') {
    const params = event.queryStringParameters || {};
    const action = params.action;

    try {
      if (action === 'get_schedules') {
        const { school } = params;
        const { data, error } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('school', school);
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ schedules: data || [] }) };
      }

      if (action === 'get_active_classes_by_date') {
        const { school, date } = params;
        const selectedDate = new Date(date + "T00:00:00");
        const dayOfWeek = selectedDate.getDay();

        const { data, error } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('school', school);

        if (error) throw error;

        const availableClasses = (data || []).filter(item => {
          const days = item.schedule_days || [];
          return days.includes(dayOfWeek);
        });

        return { statusCode: 200, body: JSON.stringify({ classes: availableClasses, dayOfWeek }) };
      }

      if (action === 'get_class_attendance') {
        const { school, className, date } = params;

        const { data: allStudents, error: errStudents } = await supabase
          .from('students')
          .select('id, username, full_name, last_name, first_name')
          .eq('school', school)
          .eq('class_name', className);
        if (errStudents) throw errStudents;

        const { data: attended, error: errAtt } = await supabase
          .from('attendance')
          .select('student_id, student_name, checkin_time, status')
          .eq('school', school)
          .eq('class_name', className)
          .eq('date', date);
        if (errAtt) throw errAtt;

        const attendedMap = new Map();
        (attended || []).forEach(item => {
          attendedMap.set(String(item.student_id), item);
        });

        const records = (allStudents || []).map(stu => {
          const att = attendedMap.get(String(stu.id));
          const name = stu.full_name || `${stu.last_name || ''} ${stu.firstName || stu.first_name || ''}`.trim() || stu.username;
          return {
            student_id: stu.id,
            username: stu.username,
            student_name: name,
            last_name: stu.last_name || '',
            first_name: stu.first_name || '',
            status: att ? 'Có mặt' : 'Vắng',
            checkin_time: att ? att.checkin_time : null
          };
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            total: records.length,
            present: attended.length,
            absent: records.length - attended.length,
            records
          })
        };
      }

      return { statusCode: 400, body: JSON.stringify({ message: "Action không hợp lệ" }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
    }
  }

  // 3. GIÁO VIÊN LƯU / SỬA / KHÓA LỊCH (PUT)
  if (method === 'PUT') {
    try {
      const { action, school, class_name, schedule_days, is_locked } = JSON.parse(event.body);

      if (action === 'save_schedule') {
        const { data, error } = await supabase
          .from('class_schedules')
          .upsert({
            school,
            class_name,
            schedule_days,
            is_locked: is_locked ?? false
          }, { onConflict: 'school,class_name' })
          .select();
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ message: "Lưu lịch lớp thành công!", data }) };
      }

      if (action === 'toggle_lock') {
        const { data, error } = await supabase
          .from('class_schedules')
          .update({ is_locked })
          .eq('school', school)
          .eq('class_name', class_name)
          .select();
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ message: "Cập nhật trạng thái khóa thành công!", data }) };
      }

      return { statusCode: 400, body: JSON.stringify({ message: "Hành động không hợp lệ" }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
    }
  }

  // 4. GIÁO VIÊN XÓA LỊCH ĐÃ ĐẶT (DELETE)
  if (method === 'DELETE') {
    try {
      const { school, class_name } = JSON.parse(event.body);
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('school', school)
        .eq('class_name', class_name);

      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ message: `Đã xóa lịch của lớp ${class_name} thành công!` }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};