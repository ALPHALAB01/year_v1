// /api/history/:id  ->  수정(PUT) / 삭제(DELETE)

function normalizeTime(raw) {
  if (!raw) return "";
  const digits = (raw.match(/\d/g) || []).join("");
  if (digits.length === 0) return "";
  let yy = "", mm = "";
  if (digits.length >= 6) {
    yy = digits.slice(2, 4); mm = digits.slice(4, 6);
  } else if (digits.length === 5) {
    if (digits.startsWith("19") || digits.startsWith("20")) { yy = digits.slice(2, 4); mm = "0" + digits.slice(4, 5); }
    else { yy = digits.slice(0, 2); mm = digits.slice(2, 4); }
  } else if (digits.length === 4) {
    if (digits.startsWith("19") || digits.startsWith("20")) { yy = digits.slice(2, 4); mm = "01"; }
    else { yy = digits.slice(0, 2); mm = digits.slice(2, 4); }
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
  const cleaned = raw.replace(/[\[\]]/g, " ");
  const arr = cleaned.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  return [...new Set(arr)].join(" ");
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

export async function onRequestPut({ request, env, params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return json({ ok: false, error: "잘못된 ID" }, 400);

    const body = await request.json();
    const content = (body.content || "").trim();
    if (!content) return json({ ok: false, error: "내용은 필수입니다." }, 400);

    const time = normalizeTime(body.time || "");
    const keywords = normalizeKeywords(body.keywords || "");

    await env.DB.prepare(
      "UPDATE history SET time = ?, content = ?, keywords = ? WHERE id = ?"
    ).bind(time, content, keywords, id).run();

    return json({ ok: true, item: { id, time, content, keywords } });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return json({ ok: false, error: "잘못된 ID" }, 400);
    await env.DB.prepare("DELETE FROM history WHERE id = ?").bind(id).run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
