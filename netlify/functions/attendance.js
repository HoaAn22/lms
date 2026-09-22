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

  // 1. HỌC SINH ĐIỂM DANH (POST)
  if (method === 'POST') {
    try {
      const { student_id, student_name, school, class_name } = JSON.parse(event.body);
      const now = new Date();
      const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const currentDayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay();

      // Kiểm tra lịch học của lớp
      const { data: schedule } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('school', school)
        .eq('class_name', class_name)
        .maybeSingle();

      if (schedule) {
        if (schedule.is_locked) {
          return { statusCode: 403, body: JSON.stringify({ message: "Lớp học hiện đang bị KHÓA điểm danh!" }) };
        }
        if (schedule.schedule_days && schedule.schedule_days.length > 0) {
          if (!schedule.schedule_days.includes(currentDayOfWeek)) {
            return { statusCode: 403, body: JSON.stringify({ message: "Hôm nay không phải ngày điểm danh theo lịch của lớp bạn!" }) };
          }
        }
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
          return { statusCode: 400, body: JSON.stringify({ message: "Bạn đã điểm danh buổi học hôm nay rồi!" }) };
        }
        throw error;
      }

      return { statusCode: 200, body: JSON.stringify({ message: "Điểm danh thành công!", data }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
    }
  }

  // 2. GIÁO VIÊN TRA CỨU & CẤU HÌNH (GET)
  if (method === 'GET') {
    const params = event.queryStringParameters || {};
    const action = params.action;

    try {
      // 2.1 Lấy danh sách cấu hình lịch học của các lớp theo trường
      if (action === 'get_schedules') {
        const { school } = params;
        const { data, error } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('school', school);
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ schedules: data || [] }) };
      }

      // 2.2 Lấy các lớp có lịch học theo Thứ (dựa trên ngày chọn)
      if (action === 'get_active_classes_by_date') {
        const { school, date } = params;
        const selectedDate = new Date(date + "T00:00:00");
        const dayOfWeek = selectedDate.getDay(); // 0: Chủ nhật, 1: T2, ...

        const { data, error } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('school', school);

        if (error) throw error;

        // Lọc các lớp có cấu hình thứ này và không bị khóa
        const availableClasses = (data || []).filter(item => {
          const days = item.schedule_days || [];
          return days.includes(dayOfWeek);
        });

        return { statusCode: 200, body: JSON.stringify({ classes: availableClasses, dayOfWeek }) };
      }

      // 2.3 Xem chi tiết điểm danh của 1 lớp: đối chiếu toàn bộ học sinh
      if (action === 'get_class_attendance') {
        const { school, className, date } = params;

        // Lấy tất cả học sinh trong lớp
        const { data: allStudents, error: errStudents } = await supabase
          .from('students')
          .select('id, username, full_name, last_name, first_name')
          .eq('school', school)
          .eq('class_name', className);
        if (errStudents) throw errStudents;

        // Lấy bản ghi đã điểm danh trong ngày
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

  // 3. GIÁO VIÊN LƯU LỊCH / KHÓA ĐIỂM DANH (PUT)
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

  return { statusCode: 405, body: "Method Not Allowed" };
};