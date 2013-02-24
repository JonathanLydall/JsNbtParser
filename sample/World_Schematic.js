/*
 * Author: Jonathan Lydall
 * Website: http://www.mordritch.com/ 
 * 
 */

com.mordritch.mcSim.World_Schematic = function(schematic, defaultSizeX, defaultSizeY, defaultSizeZ) {
	this.schematic = schematic;
	this.defaultSizeX = defaultSizeX;
	this.defaultSizeY = defaultSizeY; 
	this.defaultSizeZ = defaultSizeZ;
	this.loadedTileEntities = {}; 
	
	this.construct = function() {
		if (this.schematic == null) {
			this.makeNew(this.defaultSizeX, this.defaultSizeY, this.defaultSizeZ);
		}
		else {
			//Not all programs export TileTicks with schematics (EG: MCEdit), if there is no TileTicks NBT node, this creates it
			if (typeof this.schematic.Schematic.payload.TileTicks == 'undefined')
				this.schematic.Schematic.payload.TileTicks =
					{
						type: 9,
						payload: {
							ofType: 10,
							list: []
						}
					}; 
		}
	}
	
	/**
	 * Returns a referrence which can be used by the nbtParser to save 
	 */
	this.getNbtData = function() {
		return this.schematic;
	}
	
	/**
	 * Makes this instantiation generate and use a new schematic filled with air
	 */
	this.makeNew = function(sizeX, sizeY, sizeZ) {
		var blockByteArray = [];
		var dataByteArray = [];
		
		for (var i = 0; i < sizeX*sizeY*sizeZ; i++) {
			blockByteArray.push(0);
			dataByteArray.push(0);
		}
		 
		this.schematic = {
			Schematic: {
				type: 10,
				payload: {
					Height: {
						type: 2, 
						payload: sizeY
					},
					Length: {
						type: 2,
						payload: sizeZ
					},
					Width: {
						type: 2,
						payload: sizeX
					},
					Entities: {
						type: 9,
						payload: {
							ofType: 10,
							list: []
						}
					},
					TileEntities: {
						type: 9,
						payload: {
							ofType: 10,
							list: []
						}
					},
					TileTicks: {
						type: 9,
						payload: {
							ofType: 10,
							list: []
						}
					},
					Materials: {
						type: 8,
						payload: "Alpha"
					},
					Blocks: {
						type: 7,
						payload: blockByteArray
					},
					Data: {
						type: 7,
						payload: dataByteArray
					}
				}
			}
		};
	}

	/**
	 * Returns position within the bytearray derived from minecraft coordinates
	 * 
	 * Since BlockId and meta data layout are the same, we can use a common function
	 * to calculate the offset for both.
	 * 
	 * The overrideSize parameters are used by the setSize function.
	 * 
	 * @param	{Integer}	x				In terms of minecraft co-ordinate system
	 * @param	{Integer}	y				In terms of minecraft co-ordinate system
	 * @param	{Integer}	z				In terms of minecraft co-ordinate system
	 * @param	{Integer}	overrideSizeX	(Optional) Use this size instead of the schematics size
	 * @param	{Integer}	overrideSizeY	(Optional) Use this size instead of the schematics size
	 * @param	{Integer}	overrideSizeZ	(Optional) Use this size instead of the schematics size 
	 * @return	{Integer}					The offset of the byte
	 */
	this.getPosition = function(x, y, z, overrideSizeX, overrideSizeY, overrideSizeZ) {
		/*
		The Minecraft coordinate system is as follows:
		(http://www.minecraftwiki.net/wiki/Alpha_Level_Format/Chunk_File_Format#Block_Format)

		X 			increases East, decreases West
		Y 			increases upwards, decreases downwards
		Z			increases South, decreases North
		*/
		
		var schematicSizeX = this.schematic.Schematic.payload.Width.payload;
		var schematicSizeY = this.schematic.Schematic.payload.Height.payload;
		var schematicSizeZ = this.schematic.Schematic.payload.Length.payload;
		
		if (typeof overrideSizeX != "undefined") schematicSizeX = overrideSizeX;
		if (typeof overrideSizeY != "undefined") schematicSizeY = overrideSizeY;
		if (typeof overrideSizeZ != "undefined") schematicSizeZ = overrideSizeZ; 
		
		if (x >= schematicSizeX || x < 0)
			throw new Error("DataSchematic.getPosition(): x is out of bounds.")
		
		if (y >= schematicSizeY || y < 0)
			throw new Error("DataSchematic.getPosition(): y is out of bounds.")
		
		if (z >= schematicSizeZ || z < 0)
			throw new Error("DataSchematic.getPosition(): z is out of bounds.")
		
		return x + (z * schematicSizeX) + (y * schematicSizeX * schematicSizeZ);
	}
	
	/**
	 * Returns the blockID at specified minecraft world co-ordinates
	 */
	this.getBlockId = function(x, y, z) {
		//If a function calls for a blocktype which is off the grid, return 0 (air)
		if (
			x >= this.getSizeX() || x < 0
			|| y >= this.getSizeY()	|| y < 0
			|| z >= this.getSizeZ()	|| z < 0
		) {
			return 0;
		}
		else {
			return this.schematic.Schematic.payload.Blocks.payload[this.getPosition(x,y,z)];
		}
	}
	
	/**
	 * Returns the meta data for block at specified minecraft world co-ordinates
	 */
	this.getBlockMetadata = function(x, y, z) {
		//If a function calls for a blocktype which is off the grid, return 0
		if (
			x >= this.getSizeX() || x < 0
			|| y >= this.getSizeY()	|| y < 0
			|| z >= this.getSizeZ()	|| z < 0
		) {
			return 0;
		}
		else {
			return this.schematic.Schematic.payload.Data.payload[this.getPosition(x,y,z)];
		}
	}

	/**
	 * Sets a block and its metadata to specified values 
	 */
	this.setBlockAndMetadata = function(x, y, z, blockID, metadata) {
		if (blockID > 0xff || blockID < 0x00) throw new Error("World_Schematic.setBlockAndMetadata(): blockID value must be from 0 to 255.");
		var position = this.getPosition(x, y, z);
		this.schematic.Schematic.payload.Blocks.payload[position] = blockID; 
		this.setBlockMetadata(x, y, z, metadata);
	}

	this.setBlockID = function(x, y, z, blockID) {
		this.setBlockAndMetadata(x, y, z, blockID, 0);
	}
	
	this.setBlockMetadata = function(x, y, z, blockMetadata) {
		if (blockMetadata > 0xf || blockMetadata < 0x00) throw new Error("World_Schematic.setBlockMetadata(): value must be from 0 to 127.");
		var position = this.getPosition(x, y, z);
		this.schematic.Schematic.payload.Data.payload[position] = blockMetadata;
	}

	/**
	 * Sets a block and its metadata to specified values and resizes the schematic if values fall out of bounds
	 * 
	 * @param x
	 * @param y
	 * @param z
	 * @param blockID
	 * @param metadata
	 *
	 */
	this.forceSetBlockAndMetadata = function(x, y, z, blockID, metadata) {
		if (
			x < 0 ||
			y < 0 ||
			z < 0 ||
			x > this.getSizeX() -1 ||
			y > this.getSizeY() -1 ||
			z > this.getSizeZ() -1
		) {
			this.setDimensions(
				// if dimension is greater than or equal to the total size of the
				// schematic then set the size of the schematic to match; if not
				// get the current size of the schematic and add the inverse of the
				// dimension if the dimension is less than zero
				x >= this.getSizeX() ? x + 1 : this.getSizeX() + (x < 0 ? x * -1 : 0),
				y >= this.getSizeY() ? y + 1 : this.getSizeY() + (y < 0 ? y * -1 : 0),
				z >= this.getSizeZ() ? z + 1 : this.getSizeZ() + (z < 0 ? z * -1 : 0),
				// offset the schematic to the inverse of the dimension if
				// the dimension is less than zero
				x < 0 ? x * -1 : 0,
				y < 0 ? y * -1 : 0,
				z < 0 ? z * -1 : 0
			);
		}
		// because we've already offset the schematic we'll now
		// reset any dimensions below zero
		if ( x < 0 ) x = 0;
		if ( y < 0 ) y = 0;
		if ( z < 0 ) z = 0;
		this.setBlockAndMetadata(x, y, z, blockID, metadata);
	}
	
	/**
	 * Change the dimensions of the schematic
	 * 
	 * One can use the offset to decide where the old data will be in relation
	 * to the updated size
	 * 
	 * It's important that tileEntities, entities and tickdata are dumped from the world into the schematic
	 * before processing so that their coordinates can be updated accordingly
	 */
	this.setDimensions = function(sizeX, sizeY, sizeZ, offsetX, offsetY, offsetZ) {
		var oldBlocksArray = this.schematic.Schematic.payload.Blocks.payload;
		var oldDataArray = this.schematic.Schematic.payload.Data.payload;
		var oldSizeX = this.schematic.Schematic.payload.Width.payload;
		var oldSizeY = this.schematic.Schematic.payload.Height.payload;
		var oldSizeZ = this.schematic.Schematic.payload.Length.payload;
		
		this.schematic.Schematic.payload.Blocks.payload = [];
		this.schematic.Schematic.payload.Data.payload = [];
		this.schematic.Schematic.payload.Width.payload = sizeX;
		this.schematic.Schematic.payload.Height.payload = sizeY;
		this.schematic.Schematic.payload.Length.payload = sizeZ;
		
		//Migrate blocks and data:
		var newOffSet = 0;
		for (var iy = 0; iy < sizeY; iy++) {
			for (var iz = 0; iz < sizeZ; iz++) {
				for (var ix = 0; ix < sizeX; ix++) {
					//For loops deliberately nested in this order so that getPosition increments normally
					if (
						ix - offsetX >= 0 && ix - offsetX < oldSizeX
						&&
						iy - offsetY >= 0 && iy - offsetY < oldSizeY
						&&
						iz - offsetZ >= 0 && iz - offsetZ < oldSizeZ
					) {
						var oldOffSet = this.getPosition(ix-offsetX, iy-offsetY, iz-offsetZ, oldSizeX, oldSizeY, oldSizeZ);

						this.schematic.Schematic.payload.Blocks.payload[newOffSet] = oldBlocksArray[oldOffSet];
						this.schematic.Schematic.payload.Data.payload[newOffSet] = oldDataArray[oldOffSet];
					}
					else {
						//out of range, set it to blank
						this.schematic.Schematic.payload.Blocks.payload[newOffSet] = 0;
						this.schematic.Schematic.payload.Data.payload[newOffSet] = 0;
					}
					newOffSet++;
				}
			}
		}
		
		//Migrate tile entities and any which are no longer within the schematic dimensions
		var tileEntities = this.schematic.Schematic.payload.TileEntities.payload.list;
		for (var i = 0, newTileEntities = []; i < tileEntities.length; i++) {
			tileEntities[i].x.payload = tileEntities[i].x.payload + offsetX;
			tileEntities[i].y.payload = tileEntities[i].y.payload + offsetY;
			tileEntities[i].z.payload = tileEntities[i].z.payload + offsetZ;

			if (
				tileEntities[i].x.payload < sizeX && 
				tileEntities[i].y.payload < sizeY && 
				tileEntities[i].z.payload < sizeZ
			) {
				newTileEntities.push(tileEntities[i]);
			}
		}
		this.schematic.Schematic.payload.TileEntities.payload.list = newTileEntities;
		
		//Migrate entities and any which are no longer within the schematic dimensions
		var entities = this.schematic.Schematic.payload.Entities.payload.list;
		for (var i = 0, newEntities = []; i < entities.length; i++) {
			entities[i].Pos.payload.list[0] = entities[i].Pos.payload[0].list + offsetX;
			entities[i].Pos.payload.list[1] = entities[i].Pos.payload[1].list + offsetY;
			entities[i].Pos.payload.list[2] = entities[i].Pos.payload[2].list + offsetZ;

			if (
				entities[i].Pos.payload.list[0] < sizeX && 
				entities[i].Pos.payload.list[1] < sizeY && 
				entities[i].Pos.payload.list[2] < sizeZ
			) {
				newEntities.push(entities[i]);
			}
		}
		this.schematic.Schematic.payload.Entities.payload.list = newEntities;
		
		//Migrate tick data and any which are no longer within the schematic dimensions
		var tileTicks = this.schematic.Schematic.payload.TileTicks.payload.list;
		for (var i = 0, newTileTicks = []; i < tileTicks.length; i++) {
			tileTicks[i].x.payload = tileTicks[i].x.payload + offsetX;
			tileTicks[i].y.payload = tileTicks[i].y.payload + offsetY;
			tileTicks[i].z.payload = tileTicks[i].z.payload + offsetZ;

			if (
				tileTicks[i].x.payload < sizeX && 
				tileTicks[i].y.payload < sizeY && 
				tileTicks[i].z.payload < sizeZ
			) {
				newTileTicks.push(tileTicks[i]);
			}
			this.schematic.Schematic.payload.TileTicks.payload.list = newTileTicks;
		}
	}
	
	/**
	 * Rotates a selection of blocks where amount is the number of times to rotate the area clockwise by 90 degrees
	 * 
	 * Assumes that tickData and entities 
	 */
	this.rotateSelection = function(amount, startX, startZ, sizeX, sizeZ) {
		//TODO: Assumes for whole schematic, ignoring start and size parameters
		var AMOUNT_90 = 90;
		var AMOUNT_180 = 180;
		var AMOUNT_270 = 270;
		
		var newBlocks = [];
		var newData = [];
		var newSizeX, newSizeZ;
		var deltaX, deltaZ; 
		var blockId, blockMetadata;
		var oldPosition;
		var oldSizeX = this.getSizeX(); 
		var oldSizeY = this.getSizeY(); 
		var oldSizeZ = this.getSizeZ(); 
		var oldPosX, oldPosZ, newPosX, newPosZ;
		
		//For loop deliberately nested in that order so that getPosition function result increments normally, allowing us to just "push" into our array
		switch (amount) {
			case AMOUNT_90:
				newSizeX = oldSizeZ;
				newSizeZ = oldSizeX;
				for (var y=0; y<oldSizeY; y++) { for (var z=0; z<newSizeZ; z++) { for (var x=0; x<newSizeX; x++) {
					oldPosX = z;
					oldPosZ = newSizeX - x - 1;
					oldPosition = this.getPosition(oldPosX, y, oldPosZ, oldSizeX, oldSizeY, oldSizeZ);

					blockId = this.schematic.Schematic.payload.Blocks.payload[oldPosition];
					blockMetadata = this.schematic.Schematic.payload.Data.payload[oldPosition];

					newBlocks.push(blockId);
					newData.push(blockMetadata);
				} }	}
				this.schematic.Schematic.payload.Width.payload = newSizeX;
				this.schematic.Schematic.payload.Length.payload = newSizeZ;
				break;
			case AMOUNT_180:
				newSizeX = oldSizeX;
				newSizeZ = oldSizeZ;
				for (var y=0; y<oldSizeY; y++) { for (var z=0; z<newSizeZ; z++) { for (var x=0; x<newSizeX; x++) {
					oldPosition = this.getPosition(oldSizeX-x-1, y, oldSizeZ-z-1, oldSizeX, oldSizeY, oldSizeZ);

					blockId = this.schematic.Schematic.payload.Blocks.payload[oldPosition];
					blockMetadata = this.schematic.Schematic.payload.Data.payload[oldPosition];

					newBlocks.push(blockId);
					newData.push(blockMetadata);
				} }	}
				break;
			case AMOUNT_270:
				newSizeX = oldSizeZ;
				newSizeZ = oldSizeX;
				for (var y=0; y<oldSizeY; y++) { for (var z=0; z<newSizeZ; z++) { for (var x=0; x<newSizeX; x++) {
					oldPosition = this.getPosition(oldSizeX-z-1, y, x, oldSizeX, oldSizeY, oldSizeZ);

					blockId = this.schematic.Schematic.payload.Blocks.payload[oldPosition];
					blockMetadata = this.schematic.Schematic.payload.Data.payload[oldPosition];

					newBlocks.push(blockId);
					newData.push(blockMetadata);
				} }	}
				this.schematic.Schematic.payload.Width.payload = newSizeX;
				this.schematic.Schematic.payload.Length.payload = newSizeZ;
				break;
			default: throw new Error("Unexpected amount: " + amount);
		}
		this.schematic.Schematic.payload.Blocks.payload = newBlocks;
		this.schematic.Schematic.payload.Data.payload = newData;
		
		//Migrate tile entities
		var tileEntities = this.schematic.Schematic.payload.TileEntities.payload.list;
		switch (amount) {
			case AMOUNT_90:
				for (var i = 0; i < tileEntities.length; i++) {
					oldPosX = tileEntities[i].x.payload;
					oldPosZ = tileEntities[i].z.payload;
					newPosX = oldSizeZ - oldPosZ - 1;
					newPosZ = oldPosX;
					
					tileEntities[i].x.payload = newPosX; 
					tileEntities[i].z.payload = newPosZ;
				}
				break;
			case AMOUNT_180:
				for (var i = 0; i < tileEntities.length; i++) {
					oldPosX = tileEntities[i].x.payload;
					oldPosZ = tileEntities[i].z.payload;
					newPosX = oldSizeX - oldPosX - 1;
					newPosZ = oldSizeZ - oldPosZ - 1;
					
					tileEntities[i].x.payload = newPosX; 
					tileEntities[i].z.payload = newPosZ;
				}
				break;
			case AMOUNT_270:
				for (var i = 0; i < tileEntities.length; i++) {
					oldPosX = tileEntities[i].x.payload;
					oldPosZ = tileEntities[i].z.payload;
					newPosX = oldPosZ;
					newPosZ = oldSizeX - oldPosX - 1;
					
					tileEntities[i].x.payload = newPosX; 
					tileEntities[i].z.payload = newPosZ;
				}
				break;
			default: throw new Error("Unexpected amount: " + amount);
		}
		
		//Migrate entities
		var entities = this.schematic.Schematic.payload.Entities.payload.list;
		switch (amount) {
			case AMOUNT_90:
				for (var i = 0; i < entities.length; i++) {
					oldPosX = entities[i].Pos.payload.list[0];
					oldPosZ = entities[i].Pos.payload.list[2];
					newPosX = oldSizeZ - oldPosZ - 1;
					newPosZ = oldPosX;
					
					entities[i].Pos.payload.list[0] = newPosX;
					entities[i].Pos.payload.list[2] = newPosZ;
				}
				break;
			case AMOUNT_180:
				for (var i = 0; i < entities.length; i++) {
					oldPosX = entities[i].Pos.payload.list[0];
					oldPosZ = entities[i].Pos.payload.list[2];
					newPosX = oldSizeX - oldPosX - 1;
					newPosZ = oldSizeZ - oldPosZ - 1;
					
					entities[i].Pos.payload.list[0] = newPosX;
					entities[i].Pos.payload.list[2] = newPosZ;
				}
				break;
			case AMOUNT_270:
				for (var i = 0; i < entities.length; i++) {
					oldPosX = entities[i].Pos.payload.list[0];
					oldPosZ = entities[i].Pos.payload.list[2];
					newPosX = oldPosZ;
					newPosZ = oldSizeX - oldPosX - 1;
					
					entities[i].Pos.payload.list[0] = newPosX;
					entities[i].Pos.payload.list[2] = newPosZ;
				}
				break;
			default: throw new Error("Unexpected amount: " + amount);
		}
		
		//Migrate tick data
		var tileTicks = this.schematic.Schematic.payload.TileTicks.payload.list;
		switch (amount) {
			case AMOUNT_90:
				for (var i = 0; i < tileTicks.length; i++) {
					oldPosX = tileTicks[i].x.payload
					oldPosZ = tileTicks[i].z.payload
					newPosX = oldSizeZ - oldPosZ - 1;
					newPosZ = oldPosX;

					tileTicks[i].x.payload = newPosX;
					tileTicks[i].z.payload = newPosZ;
				}
				break;
			case AMOUNT_180:
				for (var i = 0; i < tileTicks.length; i++) {
					oldPosX = tileTicks[i].x.payload
					oldPosZ = tileTicks[i].z.payload
					newPosX = oldSizeX - oldPosX - 1;
					newPosZ = oldSizeZ - oldPosZ - 1;

					tileTicks[i].x.payload = newPosX;
					tileTicks[i].z.payload = newPosZ;
				}
				break;
			case AMOUNT_270:
				for (var i = 0; i < tileTicks.length; i++) {
					oldPosX = tileTicks[i].x.payload
					oldPosZ = tileTicks[i].z.payload
					newPosX = oldPosZ;
					newPosZ = oldSizeX - oldPosX - 1;

					tileTicks[i].x.payload = newPosX;
					tileTicks[i].z.payload = newPosZ;
				}
				break;
			default: throw new Error("Unexpected amount: " + amount);
		}
	}
	
	/**
	 * Returns the x size of the schematic in terms minecraft co-ordinate system
	 */
	this.getSizeX = function() {
		return this.schematic.Schematic.payload.Width.payload;
	}
	
	/**
	 * Returns the y size of the schematic in terms minecraft co-ordinate system
	 */
	this.getSizeY = function() {
		return this.schematic.Schematic.payload.Height.payload;
	}
	
	/**
	 * Returns the z size of the schematic in terms minecraft co-ordinate system
	 */
	this.getSizeZ = function() {
		return this.schematic.Schematic.payload.Length.payload;
	}
	
	/**
	 * @return {Array}	All Entities as an array of NBT objects
	 */
	this.getEntities = function() {
		return this.schematic.Schematic.payload.Entities.payload.list;
	}
	
	/**
	 * @param	entities	All Entities as an array of NBT objects
	 */
	this.setEntities = function(entities) {
		this.schematic.Schematic.payload.Entities.payload.list = entities;
	}
	
	/**
	 * @return {Array}	All TileEntities as an array of NBT objects
	 */
	this.getTileEntities = function() {
		return this.schematic.Schematic.payload.TileEntities.payload.list;
	}
	
	/**
	 * @param	tileEntities	All TileEntities as an array of NBT objects
	 */
	this.setTileEntities = function(tileEntities) {
		this.schematic.Schematic.payload.TileEntities.payload.list = tileEntities;
	}
	
	/**
	 * @return {Array}	All TileTicks as an array of NBT objects
	 */
	this.getTickData = function() {
		return this.schematic.Schematic.payload.TileTicks.payload.list;
	}
	
	/**
	 * @param	tileTicks	All TileTicks as an array of NBT objects
	 */
	this.setTickData = function(tileTicks) {
		this.schematic.Schematic.payload.TileTicks.payload.list = tileTicks;
	}
	
	/**
	 * Removes internal reference to the schematic object allowing it to be freed by the garbage collector.
	 * 
	 * We can't force freeing of memory in Javascript, but as long as there is no referrence to the object
	 * then the garbage collector should eventually free it up. 
	 */
	this.destroy = function() {
		delete this.schematic;
	}
    
	/**
	 * @param x
	 * @param y
	 * @param z
	 * @return object containing values x, y, z representing the chunk position
	 */
	this.getBlockChunkPosition = function(x, y, z){
		x = Math.floor( x / 16 );
		y = Math.floor( y / 16 );
		z = Math.floor( z / 16 );
		return {
	  		x: x,
	  		y: y,
	  		z: z
	  	};
	}

	this.construct();	
}
