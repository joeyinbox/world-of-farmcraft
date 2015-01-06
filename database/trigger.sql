CREATE TRIGGER trigger_insert_wof_user AFTER INSERT ON wof_user 
FOR EACH ROW 
BEGIN
	SET @fork_id = (SELECT id_weapon_type FROM wof_weapon_type WHERE name="fork");
	INSERT INTO wof_user_weapon (id_user, id_weapon_type) 
		VALUES (new.id_user, @fork_id);
END$$


CREATE TRIGGER trigger_update_wof_tile BEFORE UPDATE ON wof_tile 
FOR EACH ROW 
BEGIN
	IF old.owner!=new.owner AND new.owner=NULL THEN
		SET @water_id = (SELECT id_tile_type FROM wof_tile_type WHERE name="water");
		IF old.type!=@water_id THEN
			SET @ground_id = (SELECT id_tile_type FROM wof_tile_type WHERE name="ground");
			SET new.type = @ground_id;
		END IF;
		
		SET new.crop = NULL;
		SET new.building = NULL;
		
		DELETE FROM wof_crop
			WHERE id_crop=old.crop;
		
		DELETE FROM wof_building
			WHERE id_building=old.building;
	END IF;
END$$


CREATE TRIGGER trigger_delete_wof_building BEFORE DELETE ON wof_building 
FOR EACH ROW 
BEGIN
	SET @ground_id = (SELECT id_tile_type FROM wof_tile_type WHERE name="ground");
	UPDATE wof_tile 
		SET type=@ground_id
		WHERE building=old.id_building;
		
	DELETE FROM wof_building_crop
		WHERE id_building=old.id_building;
END$$


CREATE TRIGGER trigger_delete_wof_crop BEFORE DELETE ON wof_crop 
FOR EACH ROW 
BEGIN
	SET @ground_id = (SELECT id_tile_type FROM wof_tile_type WHERE name="ground");
	UPDATE wof_tile 
		SET type=@ground_id
		WHERE crop=old.id_crop;
END$$