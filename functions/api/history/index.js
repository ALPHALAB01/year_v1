// /api/history  ->  목록 조회(GET) / 신규 생성(POST)

function normalizeTime(raw) {
  // 어떤 형태로 입력해도 YY.MM 으로 변환
  if (!raw) return "";
  const digits = (raw.match(/\d/g) || []).join("");
  if (digits.length === 0) return "";

  let yy = "", mm = "";
  if (digits.length >= 6) {
    // YYYYMM... (예: 202306, 20230615)
    yy = digits.slice(2, 4);
    mm = digits.slice(4, 6);
  } else if (digits.length === 5) {
    // YYYYM (예: 20236)
    if (digits.startsWith("19") || digits.startsWith("20")) {
      yy = digits.slice(2, 4); mm = "0" + digits.slice(4, 5);
    } else {
      yy = digits.slice(0, 2); mm = digits.slice(2, 4);
    }
  } else if (digits.length === 4) {
    // YYMM(2306) 또는 YYYY(2023) 구분
    if (digits.startsWith("19") || digits.startsWith("20")) {
      yy = digits.slice(2, 4); mm = "01";
    } else {
      yy = digits.slice(0, 2); mm = digits.slice(2, 4);
    }
  } else if (digits.length === 3) {
    yy = digits.slice(0, 2); mm = "0" + digits.slice(2, 3);
  } else if (digits.length === 2) {
    yy = digits; mm = "01";
  } else {
    yy = "0" + digits; mm = "01";
  }
  let m = parseInt(mm, 10);
  if (isNaN(m) || m < 1) m = 1;
  if (m > 12) m = 12;
  return yy + "." + String(m).padStart(2, "0");
}

function normalizeKeywords(raw) {
  if (!raw) return "";
  // 대괄호가 있으면 제거하고, 공백/쉼표로 분리
  const cleaned = raw.replace(/[\[\]]/g, " ");
  const arr = cleaned.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  return [...new Set(arr)].join(" ");
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, time, content, keywords, is_default, created_at FROM history ORDER BY created_at DESC"
    ).all();
    return json({ ok: true, items: results || [] });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const content = (body.content || "").trim();
    if (!content) return json({ ok: false, error: "내용은 필수입니다." }, 400);

    const time = normalizeTime(body.time || "");
    const keywords = normalizeKeywords(body.keywords || "");
    const isDefault = body.is_default ? 1 : 0;
    const now = Date.now();

    const res = await env.DB.prepare(
      "INSERT INTO history (time, content, keywords, is_default, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(time, content, keywords, isDefault, now).run();

    return json({
      ok: true,
      item: { id: res.meta.last_row_id, time, content, keywords, is_default: isDefault, created_at: now }
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
