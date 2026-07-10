ALTER TABLE families ADD COLUMN tagline TEXT NOT NULL DEFAULT '收藏生活里值得回看的照片、味道和还没完成的小愿望。';
ALTER TABLE user_profiles ADD COLUMN today_experience_date TEXT;
ALTER TABLE user_profiles ADD COLUMN today_experience_amount INTEGER NOT NULL DEFAULT 0 CHECK (today_experience_amount >= 0);
