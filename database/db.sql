CREATE TABLE wof_user (
	id_user INT(7) NOT NULL AUTO_INCREMENT,
	email VARCHAR(50) NOT NULL,
	password VARCHAR(32) NOT NULL,
	admin BOOLEAN NULL DEFAULT NULL,
	difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
	life INT(3) NOT NULL,
	money BIGINT(10) NOT NULL,
	recovery VARCHAR(32) NULL DEFAULT NULL,
	PRIMARY KEY (id_user),
	UNIQUE(email))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_user_position (
	id_user INT(7) NOT NULL, 
	map_x BIGINT(10) NOT NULL, 
	map_y BIGINT(10) NOT NULL, 
	user_x BIGINT(10) NOT NULL, 
	user_y BIGINT(10) NOT NULL, 
	angle INT(1) NOT NULL DEFAULT 0,
	KEY user_position_id_user_fk (id_user),
	UNIQUE (id_user))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_tile_type (
	id_tile_type INT(2) NOT NULL AUTO_INCREMENT,
	name VARCHAR(50) NOT NULL,
	price INT(5) NULL,
	PRIMARY KEY (id_tile_type),
	UNIQUE(name))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_tile (
	id_tile BIGINT(10) NOT NULL AUTO_INCREMENT,
	type INT(2) NOT NULL,
	owner INT(7) NULL DEFAULT NULL, 
	crop BIGINT(10) NULL DEFAULT NULL,
	building BIGINT(10) NULL DEFAULT NULL,
	xpos BIGINT(10) NOT NULL,
	ypos BIGINT(10) NOT NULL,
	humidity FLOAT NOT NULL DEFAULT 0,
	fertility FLOAT NOT NULL DEFAULT 0,
	KEY tile_type_fk (type),
	KEY tile_owner_fk (owner),
	KEY tile_crop_fk (crop),
	KEY tile_building_fk (building),
	UNIQUE KEY xpos (xpos, ypos), 
	PRIMARY KEY (id_tile))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_crop (
	id_crop BIGINT(10) NOT NULL AUTO_INCREMENT,
	type INT(2) NOT NULL,
	health INT(3) NOT NULL DEFAULT 100,
	maturity INT(3) NOT NULL DEFAULT 0,
	productivity INT(2) NOT NULL,
	maturated TIMESTAMP NULL DEFAULT NULL,
	KEY crop_type_fk (type),
	PRIMARY KEY (id_crop))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_weapon_type (
	id_weapon_type INT(2) NOT NULL AUTO_INCREMENT,
	name VARCHAR(50) NOT NULL,
	price INT(5) NULL,
	PRIMARY KEY (id_weapon_type),
	UNIQUE(name))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_user_weapon (
	id_user INT(7) NOT NULL,
	id_weapon_type INT(2) NOT NULL,
	KEY user_weapon_id_user_fk (id_user),
	KEY user_weapon_id_weapon_type_fk (id_weapon_type),
	UNIQUE KEY id_user (id_user, id_weapon_type))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_building_settings (
	type INT(2) NOT NULL,
	running_cost INT(5) NULL,
	capacity INT(5) NOT NULL,
	width TINYINT(1) NOT NULL,
	height TINYINT(1) NOT NULL,
	KEY building_settings_type_fk (type),
	UNIQUE(type))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_building (
	id_building BIGINT(10) NOT NULL AUTO_INCREMENT,
	x BIGINT(10) NOT NULL,
	y BIGINT(10) NOT NULL,
	type INT(2) NOT NULL,
	owner INT(7) NOT NULL,
	KEY building_type_fk (type),
	KEY building_owner_fk (owner),
	PRIMARY KEY (id_building))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_building_crop (
	id_building_crop BIGINT(14) NOT NULL AUTO_INCREMENT,
	id_building BIGINT(10) NOT NULL,
	type INT(2) NOT NULL,
	amount INT(3) NOT NULL,
	stored TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	KEY building_crop_id_building_fk (id_building),
	KEY building_crop_type_fk (type),
	PRIMARY KEY (id_building_crop))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_alliance (
	id_alliance INT(10) NOT NULL AUTO_INCREMENT,
	PRIMARY KEY (id_alliance))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_user_alliance (
	id_user INT(7) NOT NULL,
	id_alliance INT(10) NOT NULL,
	KEY user_alliance_id_user_fk (id_user),
	KEY user_alliance_id_aliiance_fk (id_alliance),
	UNIQUE KEY id_user (id_user, id_alliance))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_settings (
	id_settings TINYINT(1) NOT NULL AUTO_INCREMENT,
	tileWidth INT(3) NOT NULL,
	tileHeight INT(3) NOT NULL, 
	mapSpeed INT(2) NOT NULL, 
	characterSpeed INT(2) NOT NULL,
	initial_life INT(3) NOT NULL,
	initial_money INT(5) NOT NULL,
	initial_owned_tiles_depth INT(4) NOT NULL,
	spawn_radius INT(4) NOT NULL,
	PRIMARY KEY (id_settings))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_environment (
	id_environment TINYINT(1) NOT NULL AUTO_INCREMENT,
	time INT(2) NOT NULL,
	PRIMARY KEY (id_environment))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_market (
	type INT(2) NOT NULL,
	price INT(5) NOT NULL,
	KEY market_type_fk (type),
	UNIQUE(type))
ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE wof_natural_event (
	id_natural_event TINYINT(2) NOT NULL AUTO_INCREMENT,
	name VARCHAR(30) NOT NULL,
	probability INT(2) NOT NULL, 
	PRIMARY KEY (id_natural_event))
ENGINE=InnoDB DEFAULT CHARSET=utf8;









CREATE VIEW wof_user_informations AS 
	SELECT u.id_user, u.life, u.money, COUNT(id_tile) as tiles_owned, ua.id_alliance
	FROM wof_user u
	LEFT JOIN wof_tile t ON(u.id_user=t.owner)
	LEFT JOIN wof_user_alliance ua ON(u.id_user=ua.id_user)
	GROUP BY u.id_user;

CREATE VIEW wof_building_informations AS
	SELECT b.id_building, b.x, b.y, tt.name type, IFNULL(SUM(bc.amount), 0) crop_stored, bs.capacity, b.owner, ua.id_alliance
	FROM wof_building b
	LEFT JOIN wof_building_crop bc ON(b.id_building=bc.id_building)
	LEFT JOIN wof_building_settings bs ON(b.type=bs.type)
	LEFT JOIN wof_tile_type tt ON (b.type=tt.id_tile_type) 
	LEFT JOIN wof_user_alliance ua ON (b.owner=ua.id_user) 
	GROUP BY b.id_building;
	
CREATE VIEW wof_tile_informations AS
	SELECT t.xpos, t.ypos, t.humidity, t.fertility, tt.name type, c.health, c.maturity, c.productivity, c.maturated, c.id_crop, b.id_building, t.owner, ua.id_alliance 
	FROM wof_tile t 
	LEFT JOIN wof_tile_type tt ON (t.type=tt.id_tile_type) 
	LEFT JOIN wof_crop c ON (t.crop=c.id_crop) 
	LEFT JOIN wof_building b ON (t.building=b.id_building) 
	LEFT JOIN wof_user_alliance ua ON (t.owner=ua.id_user) 
	GROUP BY t.xpos, t.ypos;

CREATE VIEW wof_map_boundaries AS
	SELECT MIN(xpos) min_x, MAX(xpos) max_x, MIN(ypos) min_y, MAX(ypos) max_y
	FROM wof_tile_informations;








ALTER TABLE wof_user_position 
	ADD CONSTRAINT user_position_id_user_fk FOREIGN KEY (id_user) REFERENCES wof_user(id_user) ON DELETE CASCADE;

ALTER TABLE wof_tile 
	ADD CONSTRAINT tile_type_fk FOREIGN KEY (type) REFERENCES wof_tile_type(id_tile_type),
	ADD CONSTRAINT tile_owner_fk FOREIGN KEY (owner) REFERENCES wof_user(id_user) ON DELETE SET NULL,
	ADD CONSTRAINT tile_crop_fk FOREIGN KEY (crop) REFERENCES wof_crop(id_crop) ON DELETE SET NULL,
	ADD CONSTRAINT tile_building_fk FOREIGN KEY (building) REFERENCES wof_building(id_building) ON DELETE SET NULL;

ALTER TABLE wof_crop 
	ADD CONSTRAINT crop_type_fk FOREIGN KEY (type) REFERENCES wof_tile_type(id_tile_type) ON DELETE CASCADE;

ALTER TABLE wof_user_weapon 
	ADD CONSTRAINT user_weapon_id_user_fk FOREIGN KEY (id_user) REFERENCES wof_user(id_user) ON DELETE CASCADE,
	ADD CONSTRAINT user_weapon_id_weapon_type_fk FOREIGN KEY (id_weapon_type) REFERENCES wof_weapon_type(id_weapon_type) ON DELETE CASCADE;

ALTER TABLE wof_building_settings
	ADD CONSTRAINT building_settings_type_fk FOREIGN KEY (type) REFERENCES wof_tile_type(id_tile_type) ON DELETE CASCADE;

ALTER TABLE wof_building
	ADD CONSTRAINT building_owner_fk FOREIGN KEY (owner) REFERENCES wof_user(id_user) ON DELETE CASCADE,
	ADD CONSTRAINT building_type_fk FOREIGN KEY (type) REFERENCES wof_tile_type(id_tile_type) ON DELETE CASCADE;

ALTER TABLE wof_building_crop
	ADD CONSTRAINT building_crop_id_building_fk FOREIGN KEY (id_building) REFERENCES wof_building(id_building),
	ADD CONSTRAINT building_crop_type_fk FOREIGN KEY (type) REFERENCES wof_tile_type(id_tile_type) ON DELETE CASCADE;

ALTER TABLE wof_user_alliance
	ADD CONSTRAINT user_alliance_id_user_fk FOREIGN KEY (id_user) REFERENCES wof_user(id_user) ON DELETE CASCADE,
	ADD CONSTRAINT user_alliance_id_alliance_fk FOREIGN KEY (id_alliance) REFERENCES wof_alliance(id_alliance) ON DELETE CASCADE;

ALTER TABLE wof_market 
	ADD CONSTRAINT market_type_fk FOREIGN KEY (type) REFERENCES wof_tile_type(id_tile_type);






INSERT INTO wof_tile_type (name, price)	
	VALUES ('ground', NULL),
		   ('water', NULL),
		   ('silo', 100),
		   ('barn', 250),
		   ('coldStorage', 500),
		   ('corn', 10),
		   ('tomato', 25),
		   ('wheat', 50);

INSERT INTO wof_building_settings (type, running_cost, capacity, width, height)	
	VALUES (3, NULL, 100, 1, 1),
		   (4, NULL, 300, 2, 3),
		   (5, 10, 200, 2, 2);

INSERT INTO wof_weapon_type (name, price)	
	VALUES ('fork', NULL),
		   ('baseballBat', 1000),
		   ('chainsaw', 2500),
		   ('ak47', 5000);

INSERT INTO wof_settings (id_settings, tileWidth, tileHeight, mapSpeed, characterSpeed, initial_life, initial_money, initial_owned_tiles_depth, spawn_radius)
	VALUES (1, 100, 50, 10, 5, 42, 500, 16, 50);

INSERT INTO wof_environment (id_environment, time)
	VALUES (1, 0);

INSERT INTO wof_market (type, price)
	VALUES (6, 20),
		   (7, 40),
		   (8, 80);

INSERT INTO wof_natural_event (name, probability)
	VALUES ('rain', 50),
		   ('grasshoppers', 20),
		   ('tornado', 20),
		   ('meteor', 10);