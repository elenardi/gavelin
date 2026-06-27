-- ============================================================
-- GAVELIN: CARD CHRONICLES — DATABASE SCHEMA
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS gavelin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gavelin;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255),                      -- NULL jika login via Google
  google_id     VARCHAR(100) UNIQUE,
  avatar_url    VARCHAR(500) DEFAULT NULL,
  avatar_frame  VARCHAR(100) DEFAULT 'default',    -- frame dekorasi profil
  title         VARCHAR(100) DEFAULT 'Adventurer', -- title yang bisa dibeli di shop
  level         SMALLINT UNSIGNED DEFAULT 1,
  xp            INT UNSIGNED DEFAULT 0,
  gold          INT UNSIGNED DEFAULT 500,           -- mata uang utama (shop)
  gems          INT UNSIGNED DEFAULT 20,            -- mata uang premium
  card_dust     INT UNSIGNED DEFAULT 0,             -- mata uang upgrade kartu
  pack_slots    TINYINT UNSIGNED DEFAULT 2,         -- sisa slot buka pack hari ini
  last_slot_reset DATETIME DEFAULT NULL,            -- kapan terakhir slot direset
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_google_id (google_id)
) ENGINE=InnoDB;

-- ============================================================
-- PACKS (koleksi pack yang tersedia / rilis)
-- ============================================================
CREATE TABLE packs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  image_url     VARCHAR(500),
  theme         VARCHAR(50) DEFAULT 'dungeon',  -- dungeon / dragon / arcane / undead
  rarity_weights JSON NOT NULL,                 -- {"common":60,"uncommon":25,"rare":10,"epic":4,"legendary":1}
  cost_gold     INT UNSIGNED DEFAULT 0,
  cost_gems     INT UNSIGNED DEFAULT 0,
  is_featured   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  release_date  DATE NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- CARDS (master data kartu)
-- ============================================================
CREATE TABLE cards (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pack_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,
  card_type     ENUM('character','spell','item','location','trap') NOT NULL,
  rarity        ENUM('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
  class         ENUM('warrior','mage','rogue','cleric','ranger','barbarian','druid','paladin','bard','monk','any') DEFAULT 'any',
  hp            SMALLINT UNSIGNED DEFAULT 0,
  attack        SMALLINT UNSIGNED DEFAULT 0,
  defense       SMALLINT UNSIGNED DEFAULT 0,
  energy_cost   TINYINT UNSIGNED DEFAULT 1,
  special_name  VARCHAR(100),
  special_desc  TEXT,
  special_damage SMALLINT UNSIGNED DEFAULT 0,
  flavor_text   TEXT,
  image_url     VARCHAR(500),
  -- Upgrade stats (level 1–5, seperti Marvel Snap)
  max_level     TINYINT UNSIGNED DEFAULT 5,
  -- JSON array: [{level:2,hp_bonus:5,atk_bonus:2,...},{...}]
  upgrade_stats JSON,
  dust_cost     JSON,   -- {"2":10,"3":20,"4":40,"5":80} dust per level
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
  INDEX idx_pack (pack_id),
  INDEX idx_rarity (rarity),
  INDEX idx_type (card_type)
) ENGINE=InnoDB;

-- ============================================================
-- USER CARDS (kartu yang dimiliki player)
-- ============================================================
CREATE TABLE user_cards (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  card_id       INT UNSIGNED NOT NULL,
  quantity      SMALLINT UNSIGNED DEFAULT 1,
  current_level TINYINT UNSIGNED DEFAULT 1,      -- level upgrade saat ini
  card_dust_pool INT UNSIGNED DEFAULT 0,         -- dust khusus kartu ini (dari duplikat)
  obtained_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_card (user_id, card_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- DECKS
-- ============================================================
CREATE TABLE decks (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(80) NOT NULL DEFAULT 'My Deck',
  description   VARCHAR(255),
  cover_card_id INT UNSIGNED,             -- kartu yang jadi thumbnail deck
  is_active     BOOLEAN DEFAULT TRUE,     -- deck aktif untuk battle
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE deck_cards (
  deck_id       INT UNSIGNED NOT NULL,
  card_id       INT UNSIGNED NOT NULL,
  position      TINYINT UNSIGNED DEFAULT 0,  -- urutan di deck (0-19)
  PRIMARY KEY (deck_id, card_id),
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- PACK OPENING LOG
-- ============================================================
CREATE TABLE pack_openings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  pack_id       INT UNSIGNED NOT NULL,
  cards_received JSON NOT NULL,            -- [card_id, card_id, ...]  (5 kartu)
  opened_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, opened_at)
) ENGINE=InnoDB;

-- ============================================================
-- BATTLES
-- ============================================================
CREATE TABLE battles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player1_id    INT UNSIGNED NOT NULL,
  player2_id    INT UNSIGNED,               -- NULL = vs AI
  deck1_id      INT UNSIGNED NOT NULL,
  deck2_id      INT UNSIGNED,
  winner_id     INT UNSIGNED,               -- NULL = draw / belum selesai
  is_ai         BOOLEAN DEFAULT FALSE,
  ai_difficulty ENUM('easy','normal','hard') DEFAULT 'normal',
  battle_log    JSON,                       -- array of turn logs
  turns         SMALLINT UNSIGNED DEFAULT 0,
  started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at      DATETIME,
  status        ENUM('waiting','in_progress','completed','abandoned') DEFAULT 'waiting',
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_player1 (player1_id),
  INDEX idx_player2 (player2_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- FRIENDS
-- ============================================================
CREATE TABLE friends (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id  INT UNSIGNED NOT NULL,
  addressee_id  INT UNSIGNED NOT NULL,
  status        ENUM('pending','accepted','blocked') DEFAULT 'pending',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_friendship (requester_id, addressee_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addressee (addressee_id)
) ENGINE=InnoDB;

-- ============================================================
-- CARD GIFTS (berbagi kartu duplikat ke teman)
-- ============================================================
CREATE TABLE card_gifts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id     INT UNSIGNED NOT NULL,
  receiver_id   INT UNSIGNED NOT NULL,
  card_id       INT UNSIGNED NOT NULL,
  message       VARCHAR(255),
  status        ENUM('pending','claimed','expired') DEFAULT 'pending',
  expires_at    DATETIME NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  INDEX idx_receiver (receiver_id)
) ENGINE=InnoDB;

-- ============================================================
-- SHOP ITEMS
-- ============================================================
CREATE TABLE shop_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  item_type     ENUM('avatar_frame','title','card_back','pack','gems','gold','dust') NOT NULL,
  image_url     VARCHAR(500),
  cost_gold     INT UNSIGNED DEFAULT 0,
  cost_gems     INT UNSIGNED DEFAULT 0,
  effect_data   JSON,    -- {"frame_id":"dragon_frame"} atau {"pack_id":2} dll
  is_featured   BOOLEAN DEFAULT FALSE,
  stock         INT DEFAULT -1,          -- -1 = unlimited
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE shop_purchases (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  item_id       INT UNSIGNED NOT NULL,
  quantity      SMALLINT UNSIGNED DEFAULT 1,
  paid_gold     INT UNSIGNED DEFAULT 0,
  paid_gems     INT UNSIGNED DEFAULT 0,
  purchased_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- MISSIONS (daily & weekly tasks)
-- ============================================================
CREATE TABLE missions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  mission_type  ENUM('daily','weekly') NOT NULL,
  task_type     ENUM('open_pack','win_battle','play_cards','upgrade_card','add_friend','share_card','login') NOT NULL,
  target_count  SMALLINT UNSIGNED DEFAULT 1,
  reward_gold   INT UNSIGNED DEFAULT 0,
  reward_gems   INT UNSIGNED DEFAULT 0,
  reward_dust   INT UNSIGNED DEFAULT 0,
  reward_xp     INT UNSIGNED DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE user_missions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  mission_id    INT UNSIGNED NOT NULL,
  progress      SMALLINT UNSIGNED DEFAULT 0,
  is_completed  BOOLEAN DEFAULT FALSE,
  claimed       BOOLEAN DEFAULT FALSE,
  assigned_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  reset_at      DATETIME NOT NULL,    -- kapan mission ini expired/reset
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_mission_reset (user_id, mission_id, reset_at),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- NEWS / ANNOUNCEMENTS
-- ============================================================
CREATE TABLE news (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  content       TEXT,
  image_url     VARCHAR(500),
  news_type     ENUM('update','new_pack','event','maintenance') DEFAULT 'update',
  is_pinned     BOOLEAN DEFAULT FALSE,
  published_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME
) ENGINE=InnoDB;

-- ============================================================
-- USER STATS (win/loss record)
-- ============================================================
CREATE TABLE user_stats (
  user_id       INT UNSIGNED PRIMARY KEY,
  total_battles INT UNSIGNED DEFAULT 0,
  wins          INT UNSIGNED DEFAULT 0,
  losses        INT UNSIGNED DEFAULT 0,
  draws         INT UNSIGNED DEFAULT 0,
  highest_streak INT UNSIGNED DEFAULT 0,
  current_streak INT UNSIGNED DEFAULT 0,
  packs_opened  INT UNSIGNED DEFAULT 0,
  cards_upgraded INT UNSIGNED DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  type          ENUM('friend_request','gift_received','battle_invite','mission_complete','news') NOT NULL,
  title         VARCHAR(100),
  message       VARCHAR(500),
  ref_id        INT UNSIGNED,        -- ID dari entitas terkait (friend_id, gift_id, dll)
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB;
