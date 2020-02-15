DELIMITER //
CREATE FUNCTION _generate_session()
RETURNS char(16)
SQL SECURITY INVOKER
BEGIN
	RETURN SUBSTRING(MD5(RAND()), 1, 16);
END//


DELIMITER //
CREATE OR REPLACE PROCEDURE authorization( in_email varchar(129), in_password char(64) )
authorization_lable:BEGIN
	DECLARE sha_password char(64) DEFAULT sha2( CONCAT(in_password, '1691'), 256);
	DECLARE session_time timestamp DEFAULT ( SELECT update_time FROM profiles WHERE email = in_email AND password = sha_password LIMIT 1 );
	
	IF( session_time IS NULL ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 121; -- неверный логин или пароль
		LEAVE authorization_lable;
	END IF;

	IF( NOW() > TIMESTAMPADD( MINUTE, _get_update_interval(), session_time ) ) THEN -- если пришло время обновления сессии 
		UPDATE profiles SET session = _generate_session(), update_time = CURRENT_TIMESTAMP WHERE email = in_email; -- сгенерировать новую сессию
	END IF;
	SELECT true AS success, session, TIMESTAMPADD( MINUTE, 20, update_time ) AS update_time FROM profiles WHERE email = in_email;
END//

CREATE PROCEDURE authorization_unsafe( in_email varchar(129), in_password varchar(255) )
BEGIN
	CALL authorization( in_email, sha2( CONCAT(in_password, '2545'), 256 ) );
END//


DELIMITER //
CREATE OR REPLACE PROCEDURE registration( in_email varchar(129), in_password varchar(255), in_nick varchar(100) )
BEGIN
	IF( ( SELECT COUNT(*) FROM profiles WHERE email = in_email ) = 1 ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 111; -- email занят
	ELSEIF( char_length( in_password ) < 4 ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 112; -- слишком короткий пароль
	ELSEIF( char_length( in_nick ) = 0 ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 113; -- nick - пустая строка
	ELSE
		INSERT INTO profiles VALUES( NULL, in_nick, in_email, sha2( CONCAT(in_password, '1691'), 256), NULL, _generate_session(), NULL );
		SELECT true AS success, session, TIMESTAMPADD( MINUTE, _get_update_interval(), update_time ) AS update_time FROM profiles WHERE email = in_email;
	END IF;
END//


DELIMITER //
CREATE OR REPLACE FUNCTION _check_time( in_time timestamp )
RETURNS boolean
DETERMINISTIC
SQL SECURITY INVOKER
BEGIN
	RETURN ( NOW() < TIMESTAMPADD( MINUTE, 20, in_time ) );
END//


DELIMITER //
CREATE OR REPLACE FUNCTION _get_update_interval()
RETURNS tinyint
DETERMINISTIC
NO SQL
SQL SECURITY INVOKER
BEGIN
	RETURN 18;
END//


DELIMITER //
CREATE OR REPLACE FUNCTION _verification_user( in_session char(16), in_login varchar(129) )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE utime timestamp DEFAULT ( SELECT update_time FROM profiles WHERE email = in_login AND session = in_session );

	RETURN ( utime IS NULL AND _check_time( utime ) );

END//


DELIMITER //
CREATE OR REPLACE FUNCTION _verification_player( in_session char(16), in_player int unsigned )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE utime timestamp DEFAULT ( 
		SELECT update_time 
		FROM players LEFT JOIN profiles USING( profile_id )
		WHERE player_id = in_player AND session = in_session 
		);

	RETURN ( utime IS NULL AND _check_time( utime ) );

END//


DELIMITER //
CREATE OR REPLACE PROCEDURE getInfo( in_session char(16), in_login varchar(129) )
proc_label: BEGIN
	IF( _verification_user( in_session, in_login ) = false ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 102;
		LEAVE proc_label;
	END IF;

	BEGIN

		DECLARE player int unsigned DEFAULT (
			SELECT player_id
			FROM (
				SELECT player_id
				FROM players LEFT JOIN profiles USING( profile_id )
				WHERE email = in_login
			) AS p INNER JOIN (
				SELECT DISTINCT player_id
				FROM figures
			) AS f USING( player_id )
			LIMIT 1 );

		DECLARE draws int DEFAULT (
			SELECT COUNT(*)
			FROM players LEFT JOIN profiles USING( profile_id ) LEFT JOIN right_moves USING( game_id )
			WHERE email = in_login AND right_moves.player_id IS NULL );
		
		DECLARE wins int unsigned DEFAULT ( 
			SELECT COUNT(*) 
			FROM players LEFT JOIN profiles USING( profile_id ) LEFT JOIN right_moves USING( player_id )
			WHERE email = in_login AND right_moves.game_id IS NOT NULL );

		DECLARE loses int unsigned DEFAULT ( ( 
			SELECT COUNT(*) 
			FROM players LEFT JOIN profiles USING( profile_id )
			WHERE email = in_login ) - draws - wins );

		DECLARE right_move tinyint DEFAULT false;
		
		IF( player IS NOT NULL ) THEN
			SET right_move = ( ( SELECT COUNT(*) FROM players LEFT JOIN right_moves USING( game_id ) WHERE players.player_id = player AND right_moves.player_id = player ));
			IF( right_move ) THEN
				SELECT true AS success, true AS is_playing, nick, email AS login, wins - 1 AS wins, draws, loses, player, color, right_move
				FROM profiles JOIN players USING( profile_id )
				WHERE email = in_login AND player_id = player;

			ELSE
				SELECT true AS success, true AS is_playing, nick, email AS login, wins, draws, loses - 1 AS loses, player, color, right_move
				FROM profiles JOIN players USING( profile_id )
				WHERE email = in_login AND player_id = player;
			END IF;
		ELSE
			SELECT true AS success, false AS is_playing, nick, email AS login, wins, draws, loses AS loses
			FROM profiles
			WHERE email = in_login;
		END IF;
	END;
END//


DELIMITER //
CREATE PROCEDURE isFree()
BEGIN
	SELECT COUNT(*) = 0 AS free 
		FROM figures;
END//

DELIMITER //
CREATE FUNCTION _isFree()
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	RETURN ( SELECT COUNT(*) FROM figures ) = 0 ;
END//


/* Вывести фигуры на поле */
DELIMITER //
CREATE OR REPLACE PROCEDURE getField( in_session char(16), in_player int unsigned )
proc_label: BEGIN
	IF( _verification_player( in_session, in_player ) = false ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 102;
		LEAVE proc_label;
	END IF;

	SELECT color, type, x, y
	FROM figures LEFT JOIN players USING( player_id ) LEFT JOIN coordinates USING( figure_id )
	WHERE x IS NOT NULL;

END//


DELIMITER //
CREATE OR REPLACE PROCEDURE newGame( login1 varchar(129), session1 char(16), login2 varchar(129), session2 char(16) )
BEGIN
	IF( _verification_user( session1, login1 ) = false OR _verification_user( session2, login2 ) = false ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 102; -- ошибка верификации
	ELSEIF( NOT _isFree() ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 103; -- данная операция недоступна пока сервер занят
	ELSE
		BEGIN
			DECLARE game int unsigned;
			DECLARE fcolor bit(1) DEFAULT ( rand() > 0.5 );
			SET autocommit = 0;
			START TRANSACTION;
			INSERT INTO games VALUES( NULL, NULL ); -- новая игра: #1314 - LOCK is not allowed in stored procedures
			SET game = ( SELECT MAX( game_id ) FROM games );

			-- player1
			INSERT INTO players VALUES( 
				NULL,
				(
					SELECT profile_id
					FROM profiles
					WHERE email = login1
					LIMIT 1
				),
				fcolor,
				game
			);

			-- player2
			INSERT INTO players VALUES( 
				NULL,
				(
					SELECT profile_id
					FROM profiles
					WHERE email = login2
					LIMIT 1
				),
				NOT fcolor,
				game
			);

			-- player1
			CALL _createSet( ( 
				SELECT player_id
				FROM players
				WHERE game_id = game
				ORDER BY player_id
				LIMIT 1
			) );

			-- player2
			CALL _createSet( ( 
				SELECT player_id
				FROM players
				WHERE game_id = game
				ORDER BY player_id DESC
				LIMIT 1
			) );

			-- право хода
			INSERT INTO right_moves VALUES( 
				game,
				( -- игрок с белыми фигурами
					SELECT player_id
					FROM players
					WHERE game_id = game AND color = 0
					LIMIT 1
				)
			);

			COMMIT;
			SET autocommit = 1;

			SELECT true AS success, login1, player1, color1, login2, player2, color2, right_move
			FROM (
				SELECT player_id AS player1, color AS color1, 1 AS temp
				FROM players
				WHERE game_id = game
				ORDER BY player_id
				LIMIT 1
			) AS p1 JOIN (
				SELECT player_id AS player2, color AS color2, 1 AS temp
				FROM players
				WHERE game_id = game
				ORDER BY player_id DESC
				LIMIT 1
			) AS p2 USING( temp ) JOIN (
				SELECT player_id AS right_move, 1 AS temp
				FROM (
					SELECT player_id
					FROM right_moves
					WHERE game_id = game
					LIMIT 1
				) AS t
			) AS rm USING( temp );
		END;
	END IF;

END//


DELIMITER //
CREATE PROCEDURE _createSet( player int unsigned )
SQL SECURITY INVOKER
BEGIN
	INSERT INTO figures VALUES
		( NULL, 'Bee', player ),
		( NULL, 'Bug', player ),
		( NULL, 'Bug', player ),
		( NULL, 'Spider', player ),
		( NULL, 'Spider', player ),
		( NULL, 'Grasshopper', player ),
		( NULL, 'Grasshopper', player ),
		( NULL, 'Grasshopper', player ),
		( NULL, 'Ant', player ),
		( NULL, 'Ant', player ),
		( NULL, 'Ant', player );
END//

-- распарсить путь перемещения фигуры
-- создаст временную таблицу 'path' (num, x, y), в которую поместит результат
DELIMITER //
CREATE PROCEDURE _parsePath( pathStr varchar( 16380 ) )
SQL SECURITY INVOKER
BEGIN
	DECLARE coord varchar( 13 ); -- -32768,-32768
	DECLARE fx, fy smallint;
	DROP TEMPORARY TABLE IF EXISTS path;
	CREATE TEMPORARY TABLE path(
	num tinyint NOT NULL AUTO_INCREMENT PRIMARY KEY,
	x smallint NOT NULL,
	y smallint NOT NULL,
	UNIQUE ( x, y )
	);

	WHILE( LOCATE( ';', pathStr ) <> 0 ) DO
		SET coord = SUBSTRING_INDEX( pathStr, ';', 1 );
		SET fx = SUBSTRING_INDEX( coord, ',', 1 ) * 1;
		SET fy = SUBSTRING_INDEX( coord, ',', -1 ) * 1;
		IF( fx MOD 3 = 0 AND fy MOD 2 = 0 ) THEN
			INSERT IGNORE INTO path VALUES( NULL, fx, fy );
		END IF;
		SET pathStr = RIGHT( pathStr, ( LENGTH( pathStr ) - LENGTH( coord ) - 1 ) );
	END WHILE;

END//


DELIMITER //
CREATE OR REPLACE PROCEDURE layOut( player int unsigned, session char(16), ftype enum( 'Bee', 'Bug', 'Grasshopper', 'Spider', 'Ant' ), fx smallint, fy smallint )
BEGIN
	IF( NOT _verification_player( session, player ) ) THEN

		SELECT false AS success, code, reason FROM errors WHERE code = 102; -- ошибка верификации

	ELSE

		BEGIN
			DECLARE game int unsigned DEFAULT ( SELECT game_id FROM players WHERE player_id = player );
			DECLARE figure tinyint unsigned DEFAULT( 
				SELECT figure_id 
				FROM figures LEFT JOIN coordinates USING( figure_id ) 
				WHERE player_id = player AND type = ftype AND move IS NULL 
				LIMIT 1 );
			DECLARE curr_move int unsigned DEFAULT( ( SELECT MAX( move ) FROM coordinates ) + 1 );

			IF( NOT EXISTS( SELECT 1 FROM right_moves INNER JOIN figures USING( player_id ) WHERE player_id = player ) ) THEN

				SELECT false AS success, code, reason FROM errors WHERE code = 130; -- нет права хода или игра закончилась

			ELSEIF( fx MOD 3 <> 0 OR fy MOD 2 <> 0 ) THEN
				SELECT false AS success, code, reason FROM errors WHERE code = 140; -- недопустимое значение координат

			ELSEIF(
				ftype <> 'Bee' AND 
				( 
					SELECT COUNT(*)
					FROM coordinates LEFT JOIN figures USING( figure_id ) 
					WHERE type = 'Bee' AND player_id = player 
				) = 0 AND
				( curr_move + 1 ) DIV 2 = 4 ) THEN

				SELECT false AS success, code, reason FROM errors WHERE code = 141; -- выкладывается не пчела, когда пчелы на столе нет, а номер хода равен 4

			ELSEIF( figure IS NULL ) THEN

				SELECT false AS success, code, reason FROM errors WHERE code = 142; -- на руках фигур такого типа не осталось
			
			ELSEIF( ( SELECT COUNT(*) FROM coordinates ) > 0 ) THEN

				IF( EXISTS( SELECT 1 FROM coordinates WHERE x = fx AND y = fy ) ) THEN

					SELECT false AS success, code, reason FROM errors WHERE code = 143; -- выложить фигуру невозможно, так как клетка занята
				ELSEIF( curr_move > 2 
						AND 
					EXISTS(
						SELECT 1
						FROM coordinates c1 JOIN figures USING( figure_id ) LEFT JOIN players USING( player_id )
						WHERE player_id <> player AND 
							x >= fx-3 AND x <= fx+3 AND 
							y >= fy-4 AND y <= fy+4 AND 
							move = ( 
								SELECT MAX( move ) 
								FROM coordinates c2 
								WHERE c2.x = c1.x AND c2.y = c1.y 
							)
					) ) THEN

						SELECT false AS success, code, reason FROM errors WHERE code = 144; -- невозможно выложить фигуру рядом с фигурой противника

				ELSEIF ( ( curr_move > 2 
						AND 
					NOT EXISTS(	
						SELECT 1
						FROM coordinates c1 JOIN figures USING( figure_id ) LEFT JOIN players USING( player_id )
						WHERE player_id = player AND 
							x >= fx-3 AND x <= fx+3 AND 
							y >= fy-4 AND y <= fy+4 AND 
							move = ( 
								SELECT MAX( move ) 
								FROM coordinates c2 
								WHERE c2.x = c1.x AND c2.y = c1.y 
							)
					) )
						OR (
					curr_move = 2 
						AND 
					NOT EXISTS(
						SELECT 1
						FROM coordinates
						WHERE x >= fx-3 AND x <= fx+3 AND y >= fy-4 AND y <= fy+4
					) )
				) THEN

					SELECT false AS success, code, reason FROM errors WHERE code = 145; -- фигура должна иметь хотя бы одного соседа

				ELSE

					INSERT INTO coordinates VALUES( figure, fx, fy, curr_move );

					CALL _checkMatchState( game );

					IF( _isFree() ) THEN

						SELECT true AS success, true AS finished, player_id AS winner, ftype AS type, fx AS x, fy AS y, ( curr_move + 1 ) DIV 2 AS move
						FROM right_moves 
						WHERE game_id = game
						UNION SELECT true AS success, true AS finished, NULL AS winner, ftype AS type, fx AS x, fy AS y, ( curr_move + 1 ) DIV 2 AS move
						LIMIT 1;

					ELSE

						UPDATE right_moves SET player_id = ( SELECT player_id FROM players WHERE game_id = game AND player_id <> player ) WHERE game_id = game;

						SELECT true AS success, false AS finished, player_id AS right_move, ftype AS type, fx AS x, fy AS y, ( curr_move + 1 ) DIV 2 AS move
						FROM right_moves 
						WHERE game_id = game;

					END IF;

				END IF;

			ELSE

				INSERT INTO coordinates VALUES( figure, 0, 0, 1 );

				UPDATE right_moves SET player_id = ( SELECT player_id FROM players WHERE game_id = game AND player_id <> player ) WHERE game_id = game;

				SELECT true AS success, false AS finished, player_id AS right_move, ftype AS type, 0, 0, ( curr_move + 1 ) DIV 2 AS move
				FROM right_moves
				WHERE game_id = game;

			END IF;
		END;

	END IF;
END//


DELIMITER //
CREATE OR REPLACE PROCEDURE _checkMatchState( game int unsigned )
SQL SECURITY INVOKER
BEGIN
	DECLARE beesCount tinyint DEFAULT ( SELECT COUNT(*) FROM coordinates LEFT JOIN figures USING( figure_id ) WHERE type = 'Bee' );
	DECLARE fx, fy smallint;
	DECLARE player int unsigned;

	IF( beesCount = 1 ) THEN

		SELECT player_id, x, y INTO player, fx, fy FROM coordinates LEFT JOIN figures USING( figure_id ) WHERE type = 'Bee' LIMIT 1;
		IF( (
			SELECT COUNT(*)
			FROM (
				SELECT DISTINCT x, y
				FROM coordinates
				WHERE x >= fx-3 AND x <= fx+3 AND y >= fy-4 AND y <= fy+4
			) AS t
		) = 7 ) THEN

			SET FOREIGN_KEY_CHECKS = 0;
			TRUNCATE TABLE coordinates;
			TRUNCATE TABLE figures;
			UPDATE right_moves SET player_id = ( SELECT player_id FROM players WHERE game_id = game AND player_id <> player ) WHERE game_id = game;
			UPDATE games SET finish_time = NOW() WHERE game_id = game;
		END IF;

	ELSEIF( beesCount = 2 ) THEN

		-- координаты первой пчелы
		SELECT player_id, x, y INTO player, fx, fy 
		FROM coordinates LEFT JOIN figures USING( figure_id ) 
		WHERE type = 'Bee' 
		ORDER BY player_id 
		LIMIT 1;

		IF( (
			SELECT COUNT(*)
			FROM (
				SELECT DISTINCT x, y
				FROM coordinates
				WHERE x >= fx-3 AND x <= fx+3 AND y >= fy-4 AND y <= fy+4
			) AS t
		) = 7 ) THEN
			
			-- координаты второй пчелы
			SELECT player_id, x, y INTO player, fx, fy 
			FROM coordinates LEFT JOIN figures USING( figure_id ) 
			WHERE type = 'Bee'
			ORDER BY player_id DESC
			LIMIT 1;

			IF( (
				SELECT COUNT(*) 
				FROM (
					SELECT DISTINCT x, y
					FROM coordinates
					WHERE x >= fx-3 AND x <= fx+3 AND y >= fy-4 AND y <= fy+4
				) AS t
			) = 7 ) THEN

				-- ничья ( обе пчелы окружены )
				SET FOREIGN_KEY_CHECKS = 0;
				TRUNCATE TABLE coordinates;
				TRUNCATE TABLE figures;
				SET FOREIGN_KEY_CHECKS = 1;
				DELETE FROM right_moves WHERE game_id = game;
				UPDATE games SET finish_time = NOW() WHERE game_id = game;

			ELSE
				-- первый проиграл, а второй - нет
				SET FOREIGN_KEY_CHECKS = 0;
				TRUNCATE TABLE coordinates;
				TRUNCATE TABLE figures;
				SET FOREIGN_KEY_CHECKS = 1;
				UPDATE right_moves SET player_id = player WHERE game_id = game;
				UPDATE games SET finish_time = NOW() WHERE game_id = game;

			END IF;
		
		ELSE

			-- координаты второй пчелы
			SELECT player_id, x, y INTO player, fx, fy 
			FROM coordinates LEFT JOIN figures USING( figure_id ) 
			WHERE type = 'Bee' 
			ORDER BY player_id DESC 
			LIMIT 1;

			IF( (
				SELECT COUNT(*) 
				FROM (
					SELECT DISTINCT x, y
					FROM coordinates
					WHERE x >= fx-3 AND x <= fx+3 AND y >= fy-4 AND y <= fy+4
				) AS t
			) = 7 ) THEN
				-- первый не проиграл, а второй проиграл
				SET FOREIGN_KEY_CHECKS = 0;
				TRUNCATE TABLE coordinates;
				TRUNCATE TABLE figures;
				SET FOREIGN_KEY_CHECKS = 1;
				UPDATE right_moves SET player_id = ( SELECT player_id FROM players WHERE game_id = game AND player_id <> player ) WHERE game_id = game;
				UPDATE games SET finish_time = NOW() WHERE game_id = game;

			END IF;

		END IF;

	END IF;

END//


DELIMITER //
CREATE OR REPLACE PROCEDURE shift( player int unsigned, session char(16), pathStr varchar( 16380 ) )
proc_label: BEGIN
	IF( NOT _verification_player( session, player ) ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 102; -- ошибка верификации
		LEAVE proc_label;
	END IF;

	IF( NOT EXISTS( SELECT 1 FROM right_moves INNER JOIN figures USING( player_id ) WHERE player_id = player ) ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 130; -- нет права хода или игра закончилась

	ELSEIF( NOT EXISTS( SELECT 1 FROM coordinates INNER JOIN figures USING( figure_id ) WHERE type = 'Bee' AND player_id = player ) ) THEN
		SELECT false AS success, code, reason FROM errors WHERE code = 151; -- перекладывание не разрешено пока не будет выложена пчеломатка

	ELSE
		BEGIN
			DECLARE game int unsigned DEFAULT ( SELECT game_id FROM players WHERE player_id = player );
			DECLARE curr_move int unsigned DEFAULT ( ( SELECT MAX( move ) FROM coordinates ) + 1 );
			DECLARE figure tinyint;
			DECLARE ftype enum( 'Bee', 'Bug', 'Grasshopper', 'Spider', 'Ant' );
			DECLARE sx, sy, ex, ey smallint;

			IF( pathStr = '' ) THEN
				-- пропустить ход
				UPDATE coordinates SET move = curr_move WHERE move = curr_move - 2;
				UPDATE right_moves SET player_id = ( SELECT player_id FROM players WHERE game_id = game AND player_id <> player ) WHERE game_id = game;
				
				SELECT true AS success, false AS finished, curr_move AS move, player_id AS right_move
				FROM right_moves
				WHERE game_id = game;
				LEAVE proc_label;
			END IF;

			CALL _parsePath( pathStr ); -- получить таблицу из строки

			IF( ( SELECT COUNT(*) FROM path ) = 0 ) THEN
				SELECT false AS success, code, reason FROM errors WHERE code = 152; -- ошибка при чтении пути
				LEAVE proc_label;
			END IF;

			SELECT x, y INTO sx, sy FROM path WHERE num = 1;
			SELECT figure_id, type INTO figure, ftype
			FROM coordinates c1 LEFT JOIN figures USING( figure_id ) 
			WHERE player_id = player AND 
			x = sx AND y = sy
			AND move = (
				SELECT MAX( move )
				FROM coordinates c2
				WHERE c2.x = c1.x AND c2.y = c1.y
			); -- тип перекладыввемой фигуры ( в указанных координатах наверху роя )

			IF( figure IS NULL ) THEN

				SELECT false AS success, code, reason FROM errors WHERE code = 153; -- у игрока нет фигуры в переданной позици
				LEAVE proc_label;
			END IF;

			IF( NOT _checkPathLen( ftype, ( SELECT COUNT(*) FROM path ) ) ) THEN
				SELECT false AS success, code, reason FROM errors WHERE code = 154; -- недопустимая длина пути для данной фигуры
				LEAVE proc_label;
			END IF;

			IF( NOT _pathVaild( ftype ) ) THEN
				SELECT false AS success, code, reason, ftype FROM errors WHERE code = 155; -- путь не прошел проверку
				LEAVE proc_label;
			END IF;
TODO: replace
			IF( NOT _hiveContinuity( sx, sy ) ) THEN
				SELECT false AS success, code, reason FROM errors WHERE code = 156; -- разрыв роя
				LEAVE proc_label;
			END IF;

			SELECT x, y INTO ex, ey FROM path WHERE num = ( SELECT MAX( num ) FROM path );
			UPDATE coordinates SET x = ex, y = ey, move = curr_move WHERE figure_id = figure;
			
			CALL _checkMatchState( game );

			IF( _isFree() ) THEN
				SELECT true AS success, true AS finished, player_id AS winner, ftype AS type, sx AS start_X, sy AS start_Y, ex AS end_X, ey AS end_Y, ( curr_move + 1 ) DIV 2 AS move
				FROM right_moves
				WHERE game_id = game
				UNION SELECT true AS success, true AS finished, NULL AS winner, ftype AS type, sx AS start_X, sy AS start_Y, ex AS end_X, ey AS end_Y, ( curr_move + 1 ) DIV 2 AS move;

			ELSE
				UPDATE right_moves SET player_id = ( SELECT player_id FROM players WHERE game_id = game AND player_id <> player ) WHERE game_id = game;

				SELECT true AS success, false AS finished, player_id AS right_move, ftype AS type, sx AS start_X, sy AS start_Y, ex AS end_X, ey AS end_Y, ( curr_move + 1 ) DIV 2 AS move
				FROM right_moves
				WHERE game_id = game;
			END IF;

			DROP TEMPORARY TABLE path;
		END;
	END IF;
END//

-- проверить длину пути согласно типу перемещаемой фигуры
DELIMITER //
CREATE FUNCTION _checkPathLen( ftype enum( 'Bee', 'Bug', 'Grasshopper', 'Spider', 'Ant' ), pathLen tinyint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	IF( ftype = 'Bee' OR ftype = 'Bug' ) THEN
		RETURN pathLen = 2;
	ELSEIF( ftype = 'Spider' ) THEN
		RETURN pathLen = 4;
	ELSEIF( ftype = 'Grasshopper' ) THEN
		RETURN pathLen > 2;
	ELSE
		RETURN pathLen > 1;
	END IF;
END//

-- проверка пути перемещения фигуры
DELIMITER //
CREATE FUNCTION _pathVaild( ftype enum( 'Bee', 'Bug', 'Grasshopper', 'Spider', 'Ant' ) )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE fx, fy, tx, ty smallint;
	SELECT x, y INTO fx, fy FROM path WHERE num = 1;
	CASE ftype
	WHEN 'Bug' THEN
		SELECT x, y INTO tx, ty FROM path WHERE num = 2;
		RETURN _isNeighbor( fx, fy, tx, ty ) <> false;

	WHEN 'Grasshopper' THEN
		RETURN _grasshopperPath( fx, fy );
	
	WHEN 'Bee' THEN
		RETURN _beePath( fx, fy );

	WHEN 'Spider' THEN
		RETURN _spiderPath( fx, fy );

	WHEN 'Ant' THEN
		RETURN _antPath( fx, fy );
	
	ELSE
		RETURN false;
	END CASE;
END//

DELIMITER //
CREATE FUNCTION _beePath( fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE tx, ty smallint;
	DECLARE fside tinyint;
	SELECT x, y INTO tx, ty FROM path WHERE num = 2;
	SET fside = _side( fx, fy, tx, ty );
	IF( fside < 0 ) THEN
		RETURN false; -- перемещение не в соседнюю клетку
	END IF;
	IF( _isFigure( tx, ty ) ) THEN
		RETURN false; -- занято
	END IF;
	IF( _hasNeighbor( ( ( fside + 6 - 1 ) MOD 6 ), fx, fy ) ) THEN
		IF( _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
			RETURN false; -- не пройти
		ELSE
			RETURN true;
		END IF;
	ELSEIF( _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
		RETURN true;
	ELSE
		RETURN false;
	END IF;
	RETURN false; -- ошибка
END//


DELIMITER //
CREATE OR REPLACE FUNCTION _grasshopperPath( fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE tx, ty smallint;
	DECLARE pathLen tinyint DEFAULT ( SELECT COUNT(*) FROM path );
	IF( (
		SELECT COUNT(*)
		FROM path LEFT JOIN coordinates USING( x, y )
		WHERE move IS NULL AND num <> pathLen
	) <> 0 ) THEN
		RETURN false; -- нельзя перепрыгивать через пустые клетки
	ELSEIF( EXISTS(
		SELECT 1
		FROM path INNER JOIN coordinates USING( x, y )
		WHERE num = pathLen
	) ) THEN
		RETURN false; -- конечная клетка занята
	ELSE
		SELECT x, y INTO tx, ty FROM path WHERE num = 2;
		IF( NOT _isNeighbor( fx, fy, tx, ty ) ) THEN
			RETURN false; -- координаты первого перемещения имеют недопустимое значение
		END IF;
		SET tx = tx - fx;
		SET ty = ty - fy;
		IF( (
			SELECT COUNT(*)
			FROM path
			WHERE x = ((num - 1) * tx) + fx AND y = ((num - 1) * ty) + fy
		) <> pathLen ) THEN
			RETURN false; -- путь идет не по прямой
		ELSE
			RETURN true;
		END IF;
	END IF;
	RETURN false; -- ошибка
END//

DELIMITER //
CREATE OR REPLACE FUNCTION _spiderPath( fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE tx, ty smallint;
	DECLARE fside, pathLen tinyint;
	DECLARE spPath CURSOR FOR SELECT x, y FROM path WHERE num > 1 ORDER BY num;
	OPEN spPath;
	SET pathLen = 3;
	REPEAT
		FETCH spPath INTO tx, ty;
		SET fside = _side( fx, fy, tx, ty );
		IF( fside < 0 ) THEN
			RETURN false; -- попытка перемещения не в соседнюю клетку
		END IF;
		IF( _isFigure( tx, ty ) ) THEN
			RETURN false; -- место занято
		END IF;
		IF( _hasNeighbor( ( ( fside + 6 - 1 ) MOD 6 ), fx, fy ) ) THEN
			IF( _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
				CLOSE spPath;
				RETURN false; -- не пройти
			END IF;
		ELSEIF( NOT _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
			CLOSE spPath;
			RETURN false;
		END IF; -- оторвался от роя
		SET pathLen = pathLen - 1;
		SET fx = tx;
		SET fy = ty;
	UNTIL pathLen = 0
	END REPEAT;
	CLOSE spPath;
	RETURN true; -- весь путь проверен
END//


DELIMITER //
CREATE OR REPLACE FUNCTION _antPath( fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE tx, ty smallint;
	DECLARE fside, pathLen tinyint;
	DECLARE isLeft boolean;
	DECLARE antPath CURSOR FOR SELECT x, y FROM path WHERE num > 2 ORDER BY num;

	SELECT x, y INTO tx, ty FROM path WHERE num = 2;
	SET fside = _side( fx, fy, tx, ty );
	IF( fside < 0 ) THEN
		RETURN false; -- попытка перемещения не в соседнюю клетку
	END IF;
	IF( _isFigure( tx, ty ) ) THEN
		RETURN false; -- место занято
	END IF;
	IF( _hasNeighbor( ( ( fside + 6 - 1 ) MOD 6 ), fx, fy ) ) THEN
		IF( _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
			RETURN false; -- не пройти
		ELSE
			SET isLeft = true; -- левый обход
		END IF;
	ELSEIF( NOT _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
		RETURN false;
	ELSE
		SET isLeft = false; -- правый обход
	END IF; -- оторвался от роя

	SET pathLen = ( SELECT COUNT(*) FROM path ) - 2;
	IF( pathLen = 0 ) THEN
		RETURN true;
	END IF;

	SET fx = tx;
	SET fy = ty;

	OPEN antPath;
	REPEAT
		FETCH antPath INTO tx, ty;
		SET fside = _side( fx, fy, tx, ty );
		IF( fside < 0 ) THEN
			RETURN false; -- попытка перемещения не в соседнюю клетку
		END IF;
		IF( _isFigure( tx, ty ) ) THEN
			RETURN false; -- место занято
		END IF;
		IF( _hasNeighbor( ( ( fside + 6 - 1 ) MOD 6 ), fx, fy ) ) THEN
			IF( _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
				CLOSE antPath;
				RETURN false; -- не пройти
			ELSEIF( NOT isLeft ) THEN
				CLOSE antPath;
				RETURN false; -- изменено направление обхода роя
			END IF;
		ELSEIF( NOT _hasNeighbor( ( ( fside + 1 ) MOD 6 ), fx, fy ) ) THEN
				CLOSE antPath;
				RETURN false;
		ELSEIF( isLeft ) THEN
			CLOSE antPath;
			RETURN false; -- изменено направление обхода роя
		END IF; -- оторвался от роя
		SET pathLen = pathLen - 1;
		SET fx = tx;
		SET fy = ty;
	UNTIL pathLen = 0
	END REPEAT;
	CLOSE antPath;
	RETURN true; -- весь путь проверен
END//


DELIMITER //
CREATE FUNCTION _isNeighbor( fx smallint, fy smallint, tx smallint, ty smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	RETURN ( ( tx = fx AND ABS( ty - fy ) = 4 ) OR
			( ABS( tx - fx ) = 3 AND ABS( ty - fy ) = 2 ) );
END//


DELIMITER //
CREATE FUNCTION _side( fx smallint, fy smallint, tx smallint, ty smallint )
RETURNS tinyint
SQL SECURITY INVOKER
BEGIN
	CASE
	WHEN ( tx = fx AND ty = fy + 4 ) THEN
		RETURN 0;
	WHEN ( tx = fx + 3 AND ty = fy + 2 ) THEN
		RETURN 1;
	WHEN ( tx = fx + 3 AND ty = fy - 2 ) THEN
		RETURN 2;
	WHEN ( tx = fx AND ty = fy - 4 ) THEN
		RETURN 3;
	WHEN ( tx = fx - 3 AND ty = fy - 2 ) THEN
		RETURN 4;
	WHEN ( tx = fx - 3 AND ty = fy + 2 ) THEN
		RETURN 5;
	ELSE
		RETURN -1;
	END CASE;
END//


DELIMITER //
CREATE FUNCTION _hasNeighbor( side tinyint, fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	CASE side
	WHEN 0 THEN
		RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx AND y = fy + 4 LIMIT 1 );
	WHEN 1 THEN
		RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx + 3 AND y = fy + 2 LIMIT 1 );
	WHEN 2 THEN
		RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx + 3 AND y = fy - 2 LIMIT 1 );
	WHEN 3 THEN
		RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx AND y = fy - 4 LIMIT 1 );
	WHEN 4 THEN
		RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx - 3 AND y = fy - 2 LIMIT 1 );
	WHEN 5 THEN
		RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx - 3 AND y = fy + 2 LIMIT 1 );
	END CASE;
END//

DELIMITER //
CREATE FUNCTION _isFigure( fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	RETURN EXISTS( SELECT 1 FROM coordinates WHERE x = fx AND y = fy LIMIT 1 );
END//

DELIMITER // -- TODO: delete
CREATE FUNCTION _isOutside ( fx smallint, fy smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	RETURN (
		NOT EXISTS( SELECT 1 FROM coordinates WHERE x = fx AND y = fy + 4 LIMIT 1 ) OR
		NOT EXISTS( SELECT 1 FROM coordinates WHERE x = fx + 3 AND y = fy + 2 LIMIT 1 ) OR
		NOT EXISTS( SELECT 1 FROM coordinates WHERE x = fx + 3 AND y = fy - 2 LIMIT 1 ) OR
		NOT EXISTS( SELECT 1 FROM coordinates WHERE x = fx AND y = fy - 4 LIMIT 1 ) OR
		NOT EXISTS( SELECT 1 FROM coordinates WHERE x = fx - 3 AND y = fy - 2 LIMIT 1 ) OR
		NOT EXISTS( SELECT 1 FROM coordinates WHERE x = fx - 3 AND y = fy + 2 LIMIT 1 )
	);
END//


DELIMITER //
CREATE PROCEDURE _getNeighborInOut( IN side tinyint, IN fx smallint, IN fy smallint, OUT tx smallint, OUT ty smallint, OUT res boolean )
SQL SECURITY INVOKER
BEGIN
	CASE side
	WHEN 0 THEN
		SET tx = fx;
		SET ty = fy + 4;
	WHEN 1 THEN
		SET tx = fx + 3;
		SET ty = fy + 2;
	WHEN 2 THEN
		SET tx = fx + 3;
		SET ty = fy - 2;
	WHEN 3 THEN
		SET tx = fx;
		SET ty = fy - 4;
	WHEN 4 THEN
		SET tx = fx - 3;
		SET ty = fy - 2;
	WHEN 5 THEN
		SET tx = fx - 3;
		SET ty = fy + 2;
	END CASE;

	SET res = EXISTS( SELECT 1 FROM coordinates WHERE x = tx AND y = ty );
END//

DELIMITER //
CREATE FUNCTION _hiveContinuityCheck ( figure_x smallint, figure_y smallint )
RETURNS boolean
SQL SECURITY INVOKER
BEGIN
	DECLARE fx smallint DEFAULT figure_x;
	DECLARE fy smallint DEFAULT figure_y;
	DECLARE side tinyint DEFAULT 0;
	SET @tx = fx;
	SET @ty = fy;

	CALL _getNeighborInOut( side, fx, fy, @tx, @ty, @res );

	WHILE( NOT @res ) DO
		SET side = ( side + 6 - 1 ) MOD 6;
		CALL _getNeighborInOut( side, fx, fy, @tx, @ty, @res );
	END WHILE;

	DROP TEMPORARY TABLE IF EXISTS closed_loop;
	CREATE TEMPORARY TABLE closed_loop (
		x smallint NOT NULL,
		y smallint NOT NULL,
		PRIMARY KEY (x, y)
	);

	INSERT IGNORE INTO closed_loop VALUES ( @tx, @ty );
	SET side = ( side + 1 ) MOD 6;
	
	loop_label:LOOP

		CALL _getNeighborInOut( side, fx, fy, @tx, @ty, @res );
		IF( NOT @res ) THEN
			SET fx = @tx;
			SET fy = @ty;
			SET side = ( side + 6 - 1 ) MOD 6;
		ELSEIF( @tx = figure_x AND @ty = figure_y ) THEN
			INSERT IGNORE INTO closed_loop VALUES ( figure_x, figure_y );
			LEAVE loop_label;
		ELSE
			INSERT IGNORE INTO closed_loop VALUES ( @tx, @ty );
			SET side = ( side + 1 ) MOD 6;
		END IF;

	END LOOP;

	RETURN ( SELECT COUNT(*) FROM closed_loop ) = ( SELECT COUNT(*) FROM ( SELECT DISTINCT x, y FROM coordinates WHERE _isOutside( x, y )) AS t );
END//

/* 
DELIMITER //
CREATE PROCEDURE test()
BEGIN

END//
 */

/*

CALL authorization_unsafe( 'login1', '123456' );
CALL authorization_unsafe( 'login2', '987654' );
CALL getInfo( 'b667856ad252c890', 'login1' );
CALL getInfo( '6d8ede70ffd8d985', 'login2' );
CALL newGame( 'login1', 'b667856ad252c890', 'login2', '6d8ede70ffd8d985' );
CALL layOut( 8, 'b667856ad252c890', 'Ant', 3, 6 );
CALL layOut( 9, '6d8ede70ffd8d985', 'Grasshopper', 3, -2 );

CALL shift( 8, 'b667856ad252c890', '' );
CALL shift( 9, '6d8ede70ffd8d985', '' );


INSERT INTO errors VALUES ( 102, 'Ошибка верификации' ),
( 103, 'Данная операция недоступна пока сервер занят' ),
( 111, 'Регистрация. Login занят' ),
( 112, 'Регистрация. Короткий пароль' ),
( 113, 'Регистрация. Имя пользователя - пустая строка' ),
( 121, 'Неверный логин или пароль' ),
( 114, 'Регистрация. Не хватает входных данных' ),
( 115, 'Авторизация. Не хватает входных данных' ),
( 130, 'Нет права хода или матч уже завершен' );

( , '' )
 */