/*
 * Author: Jonathan Lydall
 * Website: http://www.mordritch.com/ 
 * Date: 2011-12-30
 * 
 */

com.mordritch.mcSim.World_Schematic = function(schematic) {
	this.schematic = schematic;
	
	/**
	 * Makes this instantiation generate and use a new schematic filled with air
	 */
	this.makeNew = function(sizeX, sizeY, sizeZ) {
		var schematicSizeX = sizeZ;
		var schematicSizeY = sizeY;
		var schematicSizeZ = sizeX;

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
						payload: schematicSizeY
					},
					Length: {
						type: 2,
						payload: schematicSizeZ
					},
					Width: {
						type: 2,
						payload: schematicSizeX
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
		Schematics indexes for the Blocks and Data arrays are ordered y,z,x - that is, the x coordinate varies the fastest. 
		
		X (Width)	increases South, decreases North
		Y (Height)	increases upwards, decreases downwards
		Z (Length)	increases West, decreases East
		
		The Minecraft coordinate system is as follows:
		(http://www.minecraftwiki.net/wiki/Alpha_Level_Format/Chunk_File_Format#Block_Format)

		X 			increases East, decreases West
		Y 			increases upwards, decreases downwards
		Z			increases South, decreases North
		*/
		
		var schematicSizeX = this.schematic.Schematic.payload.Width.payload;
		var schematicSizeY = this.schematic.Schematic.payload.Height.payload;
		var schematicSizeZ = this.schematic.Schematic.payload.Length.payload;
		
		//Intentionally swapping schematicSizeZ and schematicSizeX here due to 
		//difference in minecraft and schematic coordinate system
		if (typeof overrideSizeX != "undefined") schematicSizeZ = overrideSizeX;
		if (typeof overrideSizeY != "undefined") schematicSizeY = overrideSizeY;
		if (typeof overrideSizeZ != "undefined") schematicSizeX = overrideSizeZ; 
		
		var schematicX = z;
		var schematicY = y;
		var schematicZ = schematicSizeZ - x - 1;

		
		if (schematicZ >= schematicSizeZ || schematicZ < 0)
			throw new Error("DataSchematic.getPosition(): x is out of bounds.")
		
		if (schematicY >= schematicSizeY || schematicY < 0)
			throw new Error("DataSchematic.getPosition(): y is out of bounds.")
		
		if (schematicX >= schematicSizeX || schematicX < 0)
			throw new Error("DataSchematic.getPosition(): z is out of bounds.")
		
		return ((schematicY*schematicSizeZ*schematicSizeX) + (schematicZ*schematicSizeX) + (schematicX));
	}

	/**
	 * Returns the blockID at specified minecraft world co-ordinates
	 */
	this.getBlockId = function(x, y, z) {
		return this.schematic.Schematic.payload.Blocks.payload.charCodeAt(this.getPosition(x,y,z)) & 0xff;
	}
	
	/**
	 * Returns the meta data for block at specified minecraft world co-ordinates
	 */
	this.getBlockMetadata = function(x, y, z) {
		return this.schematic.Schematic.payload.Data.payload.charCodeAt(this.getPosition(x,y,z)) & 0xff;
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
	 * Change the dimensions of the schematic
	 * 
	 * One can use the offset to decide where the old data will be in relation
	 * to the updated size
	 */
	this.setDimensions = function(sizeX, sizeY, sizeZ, offsetX, offsetY, offsetZ) {
		var oldBlocks = this.schematic.Schematic.payload.Blocks.payload;
		var oldData = this.schematic.Schematic.payload.Data.payload;
		var oldSizeX = this.schematic.Schematic.payload.Length.payload;
		var oldSizeY = this.schematic.Schematic.payload.Height.payload;
		var oldSizeZ = this.schematic.Schematic.payload.Width.payload;
		
		var fillWith = String.fromCharCode(0);
		var newString = "";
		while (newString.length < sizeX*sizeY*sizeZ)
			 newString += fillWith;
			 
		this.schematic.Schematic.payload.Blocks.payload = newString;
		this.schematic.Schematic.payload.Data.payload = newString;
		this.schematic.Schematic.payload.Length.payload = sizeX;
		this.schematic.Schematic.payload.Height.payload = sizeY;
		this.schematic.Schematic.payload.Width.payload = sizeZ;
		
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
		return this.schematic.Schematic.payload.Length.payload;
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
		return this.schematic.Schematic.payload.Width.payload;
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
}
