// /api/analyze  ->  제안요청서 분석 + 연혁 매칭 (AI)
// 활성화하려면 Cloudflare Pages 환경변수에 ANTHROPIC_API_KEY 를 등록하세요.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({
        ok: false,
        disabled: true,
        error: "AI 분석이 아직 활성화되지 않았습니다. Cloudflare 환경변수에 ANTHROPIC_API_KEY를 등록하세요."
      }, 200);
    }

    const body = await request.json();
    const rfp = (body.rfp || "").trim();
    const fmt = (body.format || "").trim();
    const history = body.history || [];

    if (!rfp) return json({ ok: false, error: "제안요청서 내용이 필요합니다." }, 400);
    if (!history.length) return json({ ok: false, error: "저장된 연혁이 없습니다." }, 400);

    const allKeywords = [...new Set(history.flatMap(r => (r.keywords || "").split(/\s+/).filter(Boolean)))];
    const historyJson = JSON.stringify(
      history.map(r => ({ time: r.time, content: r.content, keywords: r.keywords })), null, 1
    );

    const prompt = `당신은 정부 용역사업 제안서 작성 전문가입니다. 아래 제안요청서(또는 과업지시서)를 분석하고, 제안사가 보유한 연혁 DB에서 적합한 실적을 골라내세요.

[제안요청서/과업지시서]
${rfp}

[제안사 보유 연혁 DB]
${historyJson}

[DB에 등록된 전체 키워드]
${allKeywords.join(", ")}

${fmt ? "[연혁 출력 양식 — 반드시 이 형식을 따르세요]\n" + fmt + "\n" : ""}
다음 JSON 형식으로만 응답하세요. 마크다운 코드블록이나 다른 설명 없이 순수 JSON만 출력하세요:
{
  "summary": "이 사업의 핵심 내용을 2~3문장으로 요약",
  "capabilities": ["요구 역량 1", "역량 2", "역량 3"],
  "matchedKeywords": ["DB 키워드 중 이 사업에 적합한 것만"],
  "formattedHistory": "matchedKeywords에 부합하는 연혁들을 ${fmt ? "지정된 출력 양식대로" : "시기·사업명·수행내용이 드러나게"} 정리한 텍스트. 각 항목은 줄바꿈(\\n)으로 구분."
}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await apiRes.json();
    let text = (data.content || []).filter(i => i.type === "text").map(i => i.text).join("\n");
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);

    return json({ ok: true, result: parsed });
  } catch (e) {
    return json({ ok: false, error: "분석 중 오류: " + String(e) }, 500);
  }
}
