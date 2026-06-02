-- 연혁 매칭 시스템 데이터베이스 스키마
DROP TABLE IF EXISTS history;
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '',  -- 공백 구분 문자열로 저장
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_history_created ON history(created_at DESC);
