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
        .select('coins, total_coins, spent_coins, meme_id_list')
        .eq('student_id', body.id)
        .single();

      if (!itemData) {
        await supabase.from('items').insert([{
          student_id: body.id,
          coins: 100,
          total_coins: 100,
          spent_coins: 0,
          meme_id_list: []
        }]);
        itemData = { coins: 100, total_coins: 100, spent_coins: 0, meme_id_list: [] };
      }

      return createResponse(true, {
        ...student,
        coins: itemData.coins !== undefined ? itemData.coins : 100,
        total_coins: itemData.total_coins !== undefined ? itemData.total_coins : 100,
        spent_coins: itemData.spent_coins !== undefined ? itemData.spent_coins : 0,
        meme_id_list: itemData.meme_id_list || []
      });
    }

    if (action === "update_student_items") {
      const { student_id, coins, total_coins, spent_coins, meme_id_list } = body;
      const updatePayload = {};
      if (coins !== undefined) updatePayload.coins = coins;
      if (total_coins !== undefined) updatePayload.total_coins = total_coins;
      if (spent_coins !== undefined) updatePayload.spent_coins = spent_coins;
      if (meme_id_list !== undefined) updatePayload.meme_id_list = meme_id_list;

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
      const currentInventoryIds = itemData.meme_id_list || [];
      
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
      const senderList = senderItems.meme_id_list || [];
      const occurrences = senderList.filter(id => Number(id) === parsedMemeId).length;

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
        recipList = recipItems.meme_id_list || [];
      }

      const removeIndex = senderList.findIndex(id => Number(id) === parsedMemeId);
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
        id, full_name, last_name, first_name, class_name, username, password,
        scores (score_1, score_2, score_3, score_4, score_5, feedback),
        items (coins, total_coins, spent_coins, meme_id_list)
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
          feedback: s.feedback || "",
          coins: studentItems.coins !== undefined ? studentItems.coins : 100,
          total_coins: studentItems.total_coins !== undefined ? studentItems.total_coins : 100,
          spent_coins: studentItems.spent_coins !== undefined ? studentItems.spent_coins : 0,
          meme_id_list: studentItems.meme_id_list || [],
          score: `${avgScore} / ${totalScore}`
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

      await supabase.from('scores').insert([{ student_id: newUser.id, feedback: "" }]);
      await supabase.from('items').insert([{
        student_id: newUser.id,
        coins: 100,
        total_coins: 100,
        spent_coins: 0,
        meme_id_list: []
      }]);

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