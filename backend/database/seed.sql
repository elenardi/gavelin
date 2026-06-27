-- ============================================================
-- GAVELIN: CARD CHRONICLES — SEED DATA
-- ============================================================
USE gavelin;

-- ============================================================
-- PACKS
-- ============================================================
INSERT INTO packs (name, description, image_url, theme, rarity_weights, cost_gold, cost_gems, is_featured, release_date) VALUES
('Dungeon Depths',    'Pack pertama Gavelin. Berisi karakter dan monster dari kedalaman dungeon.',      '/assets/packs/dungeon-depths.png',  'dungeon', '{"common":60,"uncommon":25,"rare":10,"epic":4,"legendary":1}', 0,    0,  TRUE,  '2026-01-01'),
('Dragon''s Lair',   'Pack bertema naga. Dapatkan kartu naga legendaris!',                              '/assets/packs/dragons-lair.png',    'dragon',  '{"common":55,"uncommon":25,"rare":12,"epic":6,"legendary":2}', 500,  0,  TRUE,  '2026-02-15'),
('Arcane Academy',   'Pack bertema sihir. Mantra dan wizard misterius siap membantumu!',                '/assets/packs/arcane-academy.png',  'arcane',  '{"common":58,"uncommon":25,"rare":11,"epic":5,"legendary":1}', 500,  0,  TRUE,  '2026-03-10'),
('Undead Uprising',  'Bangkitkan army of darkness! Pack bertema undead dan necromancer.',               '/assets/packs/undead-uprising.png', 'undead',  '{"common":60,"uncommon":23,"rare":11,"epic":5,"legendary":1}', 500,  0,  FALSE, '2026-04-01'),
('Sacred Grove',     'Pack bertema alam. Druid, ranger, dan makhluk hutan menanti!',                   '/assets/packs/sacred-grove.png',   'nature',  '{"common":58,"uncommon":26,"rare":10,"epic":5,"legendary":1}', 500,  0,  FALSE, '2026-05-01');

-- ============================================================
-- CARDS — Pack 1: Dungeon Depths
-- ============================================================
INSERT INTO cards (pack_id, name, card_type, rarity, class, hp, attack, defense, energy_cost, special_name, special_desc, special_damage, flavor_text, image_url, upgrade_stats, dust_cost) VALUES
-- COMMON
(1, 'Goblin Scout',     'character', 'common',    'rogue',    30, 15, 5,  1, 'Ambush',        'Deal 20 extra damage if played first this turn.',       20, '"They may be small, but they are everywhere."',                    '/assets/cards/goblin-scout.png',    '[{"level":2,"hp":5,"atk":2,"def":1},{"level":3,"hp":8,"atk":3,"def":2},{"level":4,"hp":12,"atk":5,"def":3},{"level":5,"hp":20,"atk":8,"def":5}]', '{"2":10,"3":20,"4":40,"5":80}'),
(1, 'Kobold Warrior',   'character', 'common',    'warrior',  40, 10, 10, 1, 'Pack Tactics',  'Gain +10 ATK if you have another Kobold in play.',      0,  '"Never underestimate a Kobold in his own lair."',                  '/assets/cards/kobold-warrior.png',  '[{"level":2,"hp":5,"atk":2,"def":2},{"level":3,"hp":10,"atk":3,"def":3},{"level":4,"hp":15,"atk":5,"def":5},{"level":5,"hp":25,"atk":8,"def":8}]', '{"2":10,"3":20,"4":40,"5":80}'),
(1, 'Healing Potion',   'item',      'common',    'any',      0,  0,  0,  1, 'Restore',       'Restore 30 HP to target character.',                    0,  '"The smell is terrible, but the effect is divine."',               '/assets/cards/healing-potion.png',  '[{"level":2,"heal_bonus":5},{"level":3,"heal_bonus":10},{"level":4,"heal_bonus":20},{"level":5,"heal_bonus":35}]', '{"2":10,"3":20,"4":40,"5":80}'),
(1, 'Torch',            'item',      'common',    'any',      0,  10, 0,  1, 'Illuminate',    'Deal 10 damage and reveal opponent''s top card.',        10, '"Light in the dark is worth more than gold."',                     '/assets/cards/torch.png',           '[{"level":2,"atk":2},{"level":3,"atk":4},{"level":4,"atk":7},{"level":5,"atk":12}]', '{"2":10,"3":20,"4":40,"5":80}'),
(1, 'Spike Trap',       'trap',      'common',    'any',      0,  25, 0,  1, 'Trigger',       'Activates when opponent plays a character. Deal 25 DMG.',25, '"Whoever set this up had a sadistic sense of humor."',            '/assets/cards/spike-trap.png',      '[{"level":2,"atk":5},{"level":3,"atk":10},{"level":4,"atk":18},{"level":5,"atk":30}]', '{"2":10,"3":20,"4":40,"5":80}'),
(1, 'Dark Corridor',    'location',  'common',    'any',      0,  0,  0,  1, 'Ambush Zone',   'All characters gain Stealth for 1 turn when played here.',0, '"Silence. Darkness. Danger."',                                    '/assets/cards/dark-corridor.png',   NULL, '{"2":10,"3":20,"4":40,"5":80}'),
-- UNCOMMON
(1, 'Dwarven Fighter',  'character', 'uncommon',  'warrior',  60, 20, 20, 2, 'Shield Bash',   'Deal 20 DMG and stun target for 1 turn.',               20, '"Stone-hearted and iron-fisted."',                                 '/assets/cards/dwarven-fighter.png', '[{"level":2,"hp":8,"atk":3,"def":3},{"level":3,"hp":15,"atk":6,"def":6},{"level":4,"hp":22,"atk":9,"def":9},{"level":5,"hp":35,"atk":15,"def":15}]', '{"2":20,"3":40,"4":80,"5":150}'),
(1, 'Elven Archer',     'character', 'uncommon',  'ranger',   50, 25, 10, 2, 'Piercing Shot', 'Ignore target''s defense. Deal 25 DMG.',                 25, '"My arrows never miss. Never."',                                   '/assets/cards/elven-archer.png',    '[{"level":2,"hp":8,"atk":4,"def":2},{"level":3,"hp":15,"atk":8,"def":4},{"level":4,"hp":22,"atk":12,"def":6},{"level":5,"hp":35,"atk":20,"def":10}]', '{"2":20,"3":40,"4":80,"5":150}'),
(1, 'Shadow Bolt',      'spell',     'uncommon',  'mage',     0,  35, 0,  2, 'Dark Burst',    'Deal 35 shadow DMG. If target is stunned, deal 20 bonus DMG.',35,''"Woven from pure darkness."',                             '/assets/cards/shadow-bolt.png',     '[{"level":2,"atk":5},{"level":3,"atk":10},{"level":4,"atk":18},{"level":5,"atk":30}]', '{"2":20,"3":40,"4":80,"5":150}'),
(1, 'Dungeon Chest',    'item',      'uncommon',  'any',      0,  0,  0,  2, 'Loot',          'Draw 2 cards from your deck.',                          0,  '"Every adventurer''s dream."',                                     '/assets/cards/dungeon-chest.png',   NULL, '{"2":20,"3":40,"4":80,"5":150}'),
-- RARE
(1, 'Minotaur Guard',   'character', 'rare',      'warrior',  90, 35, 25, 3, 'Gore',          'Deal 35 DMG + 15 more if target is below 50% HP.',      35, '"Guardian of the labyrinth."',                                     '/assets/cards/minotaur-guard.png',  '[{"level":2,"hp":10,"atk":5,"def":5},{"level":3,"hp":20,"atk":10,"def":10},{"level":4,"hp":30,"atk":15,"def":15},{"level":5,"hp":50,"atk":25,"def":25}]', '{"2":50,"3":100,"4":200,"5":400}'),
(1, 'Rogue Assassin',   'character', 'rare',      'rogue',    65, 45, 10, 3, 'Backstab',      'If this is the first card you play, deal double ATK.',  45, '"She strikes from the shadows before you even know she is there."','/assets/cards/rogue-assassin.png',  '[{"level":2,"hp":8,"atk":6,"def":2},{"level":3,"hp":15,"atk":12,"def":4},{"level":4,"hp":22,"atk":18,"def":6},{"level":5,"hp":35,"atk":30,"def":10}]', '{"2":50,"3":100,"4":200,"5":400}'),
(1, 'Fireball',         'spell',     'rare',      'mage',     0,  55, 0,  3, 'Splash',        'Deal 55 DMG to target and 20 DMG to adjacent characters.',55,'"The classic choice of every arcane student."',                   '/assets/cards/fireball.png',        '[{"level":2,"atk":8},{"level":3,"atk":16},{"level":4,"atk":28},{"level":5,"atk":45}]', '{"2":50,"3":100,"4":200,"5":400}'),
-- EPIC
(1, 'Beholder',         'character', 'epic',      'any',      120,55, 30, 4, 'Eye Rays',      'Deal 55 DMG to all opponent characters.',               55, '"It sees all. It fears nothing."',                                 '/assets/cards/beholder.png',        '[{"level":2,"hp":15,"atk":8,"def":5},{"level":3,"hp":30,"atk":15,"def":10},{"level":4,"hp":45,"atk":22,"def":15},{"level":5,"hp":70,"atk":35,"def":25}]', '{"2":150,"3":300,"4":600,"5":1200}'),
(1, 'Mind Flayer',      'character', 'epic',      'mage',     100,50, 20, 4, 'Mind Blast',    'Target character skips their next turn.',               50, '"Your mind is a tapestry to be unraveled."',                       '/assets/cards/mind-flayer.png',     '[{"level":2,"hp":12,"atk":8,"def":3},{"level":3,"hp":25,"atk":15,"def":6},{"level":4,"hp":38,"atk":22,"def":9},{"level":5,"hp":60,"atk":35,"def":15}]', '{"2":150,"3":300,"4":600,"5":1200}'),
-- LEGENDARY
(1, 'Dungeon Master',   'character', 'legendary', 'any',      200,80, 50, 5, 'Reality Bend',  'Choose: deal 80 DMG to 1 target OR heal your team 80 HP.',80,'"He does not play the game. He IS the game."',                   '/assets/cards/dungeon-master.png',  '[{"level":2,"hp":20,"atk":10,"def":8},{"level":3,"hp":40,"atk":20,"def":15},{"level":4,"hp":60,"atk":30,"def":22},{"level":5,"hp":100,"atk":50,"def":35}]', '{"2":500,"3":1000,"4":2000,"5":4000}');

-- ============================================================
-- CARDS — Pack 2: Dragon's Lair
-- ============================================================
INSERT INTO cards (pack_id, name, card_type, rarity, class, hp, attack, defense, energy_cost, special_name, special_desc, special_damage, flavor_text, image_url, upgrade_stats, dust_cost) VALUES
(2, 'Dragon Hatchling',  'character', 'common',    'warrior',  35, 12, 8,  1, 'Flame Breath', 'Deal 12 fire DMG to 1 target.',                         12, '"Cute now. Terrifying later."',                                    '/assets/cards/dragon-hatchling.png','[{"level":2,"hp":5,"atk":2,"def":2},{"level":3,"hp":10,"atk":4,"def":4},{"level":4,"hp":15,"atk":7,"def":6},{"level":5,"hp":25,"atk":12,"def":10}]', '{"2":10,"3":20,"4":40,"5":80}'),
(2, 'Dragon Egg',        'item',      'common',    'any',      0,  0,  0,  1, 'Hatch',        'Summon a Dragon Hatchling token with 20 HP / 10 ATK.',   0,  '"Fragile. Precious. Dangerous."',                                  '/assets/cards/dragon-egg.png',      NULL, '{"2":10,"3":20,"4":40,"5":80}'),
(2, 'Fire Drake',        'character', 'uncommon',  'warrior',  70, 30, 15, 2, 'Dive Bomb',    'Deal 30 DMG and reduce target DEF by 10 for 2 turns.',  30, '"Fast, furious, and on fire."',                                    '/assets/cards/fire-drake.png',      '[{"level":2,"hp":10,"atk":5,"def":3},{"level":3,"hp":20,"atk":10,"def":6},{"level":4,"hp":30,"atk":15,"def":9},{"level":5,"hp":50,"atk":25,"def":15}]', '{"2":20,"3":40,"4":80,"5":150}'),
(2, 'Ice Wyvern',        'character', 'rare',      'mage',     80, 40, 20, 3, 'Frost Nova',   'Freeze all opponent characters for 1 turn.',            40, '"Cold as the mountains it calls home."',                           '/assets/cards/ice-wyvern.png',      '[{"level":2,"hp":10,"atk":6,"def":4},{"level":3,"hp":20,"atk":12,"def":8},{"level":4,"hp":30,"atk":18,"def":12},{"level":5,"hp":50,"atk":30,"def":20}]', '{"2":50,"3":100,"4":200,"5":400}'),
(2, 'Dragon Knight',     'character', 'epic',      'paladin',  130,60, 40, 4, 'Dragon Bond',  'If you control a dragon, gain +30 ATK this turn.',      60, '"He rides to war with the mightiest ally of all."',                '/assets/cards/dragon-knight.png',   '[{"level":2,"hp":15,"atk":8,"def":6},{"level":3,"hp":30,"atk":15,"def":12},{"level":4,"hp":45,"atk":22,"def":18},{"level":5,"hp":70,"atk":35,"def":30}]', '{"2":150,"3":300,"4":600,"5":1200}'),
(2, 'Ancient Red Dragon','character', 'legendary', 'any',      250,100,60, 5, 'Cataclysm',    'Deal 100 DMG to all opponents and reduce their ATK by 20 for 3 turns.',100,'"Before the age of men, before the age of elves—there were dragons."','/assets/cards/ancient-red-dragon.png','[{"level":2,"hp":25,"atk":12,"def":10},{"level":3,"hp":50,"atk":25,"def":20},{"level":4,"hp":75,"atk":38,"def":30},{"level":5,"hp":120,"atk":60,"def":50}]', '{"2":500,"3":1000,"4":2000,"5":4000}');

-- ============================================================
-- MISSIONS
-- ============================================================
INSERT INTO missions (name, description, mission_type, task_type, target_count, reward_gold, reward_gems, reward_dust, reward_xp) VALUES
-- Daily
('Daily Login',         'Login ke game hari ini.',                  'daily',  'login',        1,   50,  0, 0,   100),
('Open a Pack',         'Buka 1 pack hari ini.',                    'daily',  'open_pack',    1,   100, 0, 10,  150),
('Win 1 Battle',        'Menangkan 1 pertarungan.',                 'daily',  'win_battle',   1,   150, 0, 20,  200),
('Play 5 Cards',        'Mainkan 5 kartu dalam pertarungan.',       'daily',  'play_cards',   5,   80,  0, 10,  100),
-- Weekly
('Win 5 Battles',       'Menangkan 5 pertarungan minggu ini.',      'weekly', 'win_battle',   5,   500, 2, 50,  500),
('Open 3 Packs',        'Buka 3 pack minggu ini.',                  'weekly', 'open_pack',    3,   300, 1, 30,  300),
('Upgrade a Card',      'Upgrade 1 kartu minggu ini.',              'weekly', 'upgrade_card', 1,   400, 1, 100, 400),
('Add a Friend',        'Tambahkan 1 teman minggu ini.',            'weekly', 'add_friend',   1,   200, 0, 20,  200),
('Share a Card',        'Kirim 1 kartu duplikat ke teman.',         'weekly', 'share_card',   1,   250, 1, 30,  250);

-- ============================================================
-- SHOP ITEMS
-- ============================================================
INSERT INTO shop_items (name, description, item_type, image_url, cost_gold, cost_gems, effect_data, is_featured, is_active) VALUES
('Dragon Frame',        'Border profil berbentuk naga menyala.',        'avatar_frame', '/assets/shop/frame-dragon.png',    0,    50,  '{"frame_id":"dragon_frame"}',   TRUE,  TRUE),
('Arcane Frame',        'Border profil bertema sihir ungu.',            'avatar_frame', '/assets/shop/frame-arcane.png',    0,    30,  '{"frame_id":"arcane_frame"}',   FALSE, TRUE),
('Gold Frame',          'Border profil emas berkilau.',                 'avatar_frame', '/assets/shop/frame-gold.png',      1000, 0,   '{"frame_id":"gold_frame"}',     FALSE, TRUE),
('Dragon Slayer',       'Title keren untuk profil kamu.',              'title',        '/assets/shop/title-slayer.png',    0,    20,  '{"title":"Dragon Slayer"}',     TRUE,  TRUE),
('Dungeon Lord',        'Title bergaya untuk master dungeon.',         'title',        '/assets/shop/title-lord.png',      2000, 0,   '{"title":"Dungeon Lord"}',      FALSE, TRUE),
('Dark Card Back',      'Tampilan belakang kartu gelap misterius.',    'card_back',    '/assets/shop/back-dark.png',       0,    40,  '{"back_id":"dark_back"}',       FALSE, TRUE),
('Dragon Card Back',    'Tampilan belakang kartu dengan motif naga.',  'card_back',    '/assets/shop/back-dragon.png',     1500, 0,   '{"back_id":"dragon_back"}',     TRUE,  TRUE),
('Gem Bundle (100)',    'Dapatkan 100 Gems!',                          'gems',         '/assets/shop/gems-100.png',        5000, 0,   '{"gems":100}',                  FALSE, TRUE),
('Gold Bundle (1000)',  'Dapatkan 1000 Gold!',                        'gold',         '/assets/shop/gold-1000.png',       0,    10,  '{"gold":1000}',                 FALSE, TRUE),
('Dust Bundle (200)',   'Dapatkan 200 Dust untuk upgrade kartu!',     'dust',         '/assets/shop/dust-200.png',        800,  0,   '{"dust":200}',                  FALSE, TRUE);

-- ============================================================
-- NEWS
-- ============================================================
INSERT INTO news (title, content, image_url, news_type, is_pinned, published_at) VALUES
('Selamat Datang di Gavelin!',    'Gavelin: Card Chronicles kini resmi diluncurkan! Mainkan game kartu D&D pertama yang bisa dimainkan di browser dan mobile. Dapatkan pack gratis harian dan bangun deck terkuatmu!', '/assets/news/welcome.png',      'update',   TRUE, NOW()),
('Pack Baru: Dragon''s Lair!',    'Pack kedua Gavelin kini tersedia! Kumpulkan kartu naga legendaris dan kuasai medan pertempuran. Ancient Red Dragon menunggumu!',                                                    '/assets/news/dragons-lair.png', 'new_pack', TRUE, NOW()),
('Update v1.1 — Battle Revamp',   'Sistem pertarungan diperbarui dengan animasi baru, AI yang lebih cerdas, dan sistem energy yang lebih seimbang. Coba sekarang!',                                                    '/assets/news/update.png',       'update',   FALSE, NOW());
