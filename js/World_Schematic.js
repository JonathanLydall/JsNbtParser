/*
 * Author: Jonathan Lydall
 * Website: http://www.mordritch.com/ 
 * Date: 2012-01-03
 * 
 */

com.mordritch.mcSim.World_Schematic = function(schematic) {
	this.schematic = schematic;
	
	/**
	 * Makes this instantiation generate and use a new schematic filled with air
	 */
	this.makeNew = function(sizeX, sizeY, sizeZ) {
		var byteArrayContents = "";
		
		for (var i = 0; i < sizeX*sizeY*sizeZ; i++) {
			byteArrayContents += String.fromCharCode(0);
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
							type: 10,
							payload: new Array()
						}
					},
					TileEntities: {
						type: 9,
						payload: {
							type: 10,
							payload: new Array()
						}
					},
					Materials: {
						type: 8,
						payload: "Alpha"
					},
					Blocks: {
						type: 7,
						payload: byteArrayContents
					},
					Data: {
						type: 7,
						payload: byteArrayContents
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
		return y + z * this.chunkSizeY + x * this.chunkSizeY * this.chunkSizeZ;

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
			return this.schematic.Schematic.payload.Blocks.payload.charCodeAt(this.getPosition(x,y,z)) & 0xff;
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
			return this.schematic.Schematic.payload.Data.payload.charCodeAt(this.getPosition(x,y,z)) & 0xff;
		}
	}

	/**
	 * Sets a block and its metadata to specified values 
	 */
	this.setBlockAndMetadata = function(x, y, z, blockId, metadata) {
		var position = this.getPosition(x, y, z);
		
		this.schematic.Schematic.payload.Blocks.payload =
			this.replaceAt(this.schematic.Schematic.payload.Blocks.payload, position, String.fromCharCode(blockId)); 

		this.schematic.Schematic.payload.Data.payload =
			this.replaceAt(this.schematic.Schematic.payload.Data.payload, position, String.fromCharCode(metadata)); 
	}

	/**
	 * @param x
	 * @param y
	 * @param z
	 * @param blockId
	 * @param metadata
	 *
	 * Sets a block and its metadata to specified values and resizes
	 * the schematic if values fall out of bounds
	 */
	this.forceSetBlockAndMetadata = function(x, y, z, blockId, metadata) {
		if ( x < 0 ||
		     y < 0 ||
		     z < 0 ||
		     x > this.getSizeX() -1 ||
		     y > this.getSizeY() -1 ||
		     z > this.getSizeZ() -1 ) {
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
		this.setBlockAndMetadata(x, y, z, blockId, metadata);
	}
	
	/**
	 * Change the dimensions of the schematic
	 * 
	 * One can use the offset to decide where the old data will be in relation
	 * to the updated size
	 */
	this.setDimensions = function(sizeX, sizeY, sizeZ, offsetX, offsetY, offsetZ) {
		var oldBlocks = this.schematic.Schematic.payload.Blocks.payload;
		var oldData = this.schematic.Schematic.payload.Data.payload;
		var oldSizeX = this.schematic.Schematic.payload.Width.payload;
		var oldSizeY = this.schematic.Schematic.payload.Height.payload;
		var oldSizeZ = this.schematic.Schematic.payload.Length.payload;
		
		var fillWith = String.fromCharCode(0);
		var newString = "";
		while (newString.length < sizeX*sizeY*sizeZ)
			 newString += fillWith;
			 
		this.schematic.Schematic.payload.Blocks.payload = newString;
		this.schematic.Schematic.payload.Data.payload = newString;
		this.schematic.Schematic.payload.Width.payload = sizeX;
		this.schematic.Schematic.payload.Height.payload = sizeY;
		this.schematic.Schematic.payload.Length.payload = sizeZ;
		
		var oldBlockId;
		var oldBlockMetadata;
		
		for(var ix =0; ix < oldSizeX; ix++) {
			for(var iy =0; iy < oldSizeY; iy++) {
				for(var iz =0; iz < oldSizeZ; iz++) {
					//Don't migrate this block unless it data falls within the new dimensions
					//after taking the desired offset into account:
					if (
						ix + offsetX >= 0 && ix + offsetX < sizeX
						&&
						iy + offsetY >= 0 && iy + offsetY < sizeY
						&&
						iz + offsetZ >= 0 && iz + offsetZ < sizeZ
					) {
						oldBlockId = oldBlocks.charCodeAt(this.getPosition(ix, iy, iz, oldSizeX, oldSizeY, oldSizeZ));
						oldBlockMetadata = oldData.charCodeAt(this.getPosition(ix, iy, iz, oldSizeX, oldSizeY, oldSizeZ));
						
						this.setBlockAndMetadata(ix + offsetX, iy + offsetY, iz + offsetZ, oldBlockId, oldBlockMetadata);
					}
				}
			}
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
	 * Retrieve a Tile Entity
	 */
	this.getTileEntity = function(x, y, z) {
		//TODO: Implement
	}
	
	/**
	 * Retrieve an entity
	 */
	this.getEntity = function(x, y, z) {
		//TODO: Implement
	}
	
	/**
	 * Replaces a character in a string at a specific offset
	 */
	this.replaceAt = function(string, index, character) {
		return string.substr(0,index) + character + string.substr(index+character.length);
	}
	
	/**
	 * Removes internal reference to the schematic object allowing it to be freed by the garbage collector.
	 * 
	 * We can't force freeing of memory in Javascript, but as long as there is no referrence to the object
	 * then the garbage collector should eventually free it up. 
	 */
	this.destroy = function() {
		this.schematic = undefined;
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
	  return { x : x, y : y, z : z };
	}
}
