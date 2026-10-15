const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

let supabase = null;

const reportFields = {
  start_of_class: ['repStart_Teacher', 'repStart_TA', 'repStart_Room', 'repStart_TotalPC', 'repStart_BrokenPC', 'repStart_MissingPC', 'repStart_Netsupport', 'repStart_Speaker', 'repStart_AC'],
  end_of_class: ['rep_Teacher', 'rep_TA', 'rep_Room', 'rep_TotalPC', 'rep_Docs', 'rep_BrokenPC', 'rep_MissingPC', 'rep_Netsupport', 'rep_Speaker', 'rep_AC', 'rep_Power', 'rep_Chairs', 'rep_Clean', 'rep_Rules', 'rep_Violations'],
  professional_1: ['repPro_Teacher', 'repPro_Class', 'repPro_Subject', 'repPro_Materials', 'repPro_Content', 'repPro_PlannedLessons', 'repPro_TaughtLessons', 'repPro_CompletionCount', 'repPro_FlashGM', 'repPro_FlashOT', 'repPro_Gmetrix'],
  professional_2: ['repPro_Teacher', 'repPro_Class', 'repPro_Subject', 'repPro_Materials', 'repPro_Content', 'repPro_PlannedLessons', 'repPro_TaughtLessons', 'repPro_CompletionCount', 'repPro_FlashGM', 'repPro_FlashOT', 'repPro_Gmetrix']
};

const createResponse = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const reportTypeExists = reportType => Object.prototype.hasOwnProperty.call(reportFields, reportType);

const verifyTeacherSession = async (username, token) => {
  if (typeof username !== 'string' || !username.trim() || typeof token !== 'string' || !token) return null;

  let session;
  try {
    session = jwt.verify(token, process.env.SUPABASE_SERVICE_KEY, { algorithms: ['HS256'] });
  } catch (error) {
    return null;
  }

  if (session.role !== 'teacher' || session.username !== username.trim() || !session.id) return null;

  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('username', username.trim())
    .eq('id', session.id)
    .maybeSingle();
  if (error) throw error;

  return data ? { id: String(session.id), username: username.trim() } : null;
};

const validateReportData = (reportType, reportData) => {
  if (!reportData || typeof reportData !== 'object' || Array.isArray(reportData)) return false;

  const allowedFields = new Set([
    ...reportFields[reportType],
    ...(reportType === 'end_of_class' ? ['classesInfo'] : [])
  ]);

  return reportFields[reportType].every(field => typeof reportData[field] === 'string' && reportData[field].length <= 2000)
    && Object.entries(reportData).every(([field, value]) => allowedFields.has(field) && typeof value === 'string' && value.length <= 2000);
};

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { success: false, message: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return createResponse(500, { success: false, message: 'Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_KEY' });
  }

  if (!supabase) supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      return createResponse(400, { success: false, message: 'Dữ liệu yêu cầu không đúng định dạng JSON.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return createResponse(400, { success: false, message: 'Dữ liệu yêu cầu không hợp lệ.' });
    }

    const teacher = await verifyTeacherSession(body.teacher_username, body.teacher_session_token);
    if (!teacher) {
      return createResponse(401, { success: false, message: 'Phiên giáo viên không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.' });
    }

    const { action, report_type: reportType } = body;
    if (!reportTypeExists(reportType)) {
      return createResponse(400, { success: false, message: 'Loại báo cáo không hợp lệ.' });
    }

    if (action === 'load') {
      const { data, error } = await supabase
        .from('teacher_reports')
        .select('report_data, created_at')
        .eq('teacher_id', teacher.id)
        .eq('report_type', reportType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return createResponse(200, { success: true, data });
    }

    if (action === 'save') {
      if (!validateReportData(reportType, body.report_data)) {
        return createResponse(400, { success: false, message: 'Dữ liệu báo cáo không hợp lệ.' });
      }

      const { data, error } = await supabase
        .from('teacher_reports')
        .insert({
          teacher_id: teacher.id,
          teacher_username: teacher.username,
          report_type: reportType,
          report_data: body.report_data
        })
        .select('id, created_at')
        .single();
      if (error) throw error;
      return createResponse(201, { success: true, data });
    }

    return createResponse(400, { success: false, message: 'Hành động không hợp lệ.' });
  } catch (error) {
    console.error('Lỗi xử lý báo cáo giáo viên:', error);
    return createResponse(500, { success: false, message: 'Không thể xử lý báo cáo. Vui lòng thử lại.' });
  }
};
