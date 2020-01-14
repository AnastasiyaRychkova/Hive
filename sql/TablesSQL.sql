CREATE TABLE profiles (
	profile_id int unsigned PRIMARY KEY AUTO_INCREMENT NOT NULL,
	nick varchar(100) NOT NULL,
	email varchar(129) UNIQUE NOT NULL,
	password char(64) NOT NULL,
	registration_date timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	session char(16) NOT NULL,
	update_time timestamp DEFAULT CURRENT_TIMESTAMP,
);

ALTER TABLE `profiles` ADD INDEX `session_idx` (`session`);

CREATE TABLE games (
	game_id int unsigned PRIMARY KEY AUTO_INCREMENT NOT NULL,
	finish_time timestamp NULL
);

CREATE TABLE players (
	player_id int unsigned PRIMARY KEY AUTO_INCREMENT NOT NULL,
	profile_id int unsigned NOT NULL,
	color bit(1) NOT NULL, -- 0 - white; 1 - black
	game_id int unsigned NOT NULL,
	FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
	FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

CREATE TABLE right_moves (
	game_id int unsigned PRIMARY KEY NOT NULL,
	player_id int unsigned NOT NULL,
	FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
	FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

CREATE TABLE figures (
	figure_id tinyint unsigned PRIMARY KEY AUTO_INCREMENT NOT NULL,
	type enum ('Bee', 'Bug', 'Grasshopper', 'Spider', 'Ant' ) NOT NULL,
	player_id int unsigned NOT NULL,
	FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

CREATE TABLE coordinates (
	figure_id tinyint unsigned PRIMARY KEY NOT NULL,
	x smallint NOT NULL,
	y smallint NOT NULL,
	move int unsigned NOT NULL UNIQUE,
	FOREIGN KEY (figure_id) REFERENCES figures(figure_id) ON DELETE CASCADE
);

CREATE TABLE errors (
	code smallint unsigned PRIMARY KEY NOT NULL,
	reason varchar( 16380 ) NOT NULL
)