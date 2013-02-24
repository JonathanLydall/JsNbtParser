/*
 * Author: Jonathan Lydall
 * Website: http://www.mordritch.com/ 
 * 
 */

(function(){
	function NbtParser() {
		this.TAG_End = 0;
		this.TAG_Byte = 1;
		this.TAG_Short = 2;
		this.TAG_Int = 3;
		this.TAG_Long = 4;
		this.TAG_Float = 5;
		this.TAG_Double = 6;
		this.TAG_Byte_Array = 7;
		this.TAG_String = 8;
		this.TAG_List = 9;
		this.TAG_Compound = 10;
		this.TAG_Int_Array = 11;
	
		this.binaryParser = new BinaryParser(true, false);
		this.expectedStartingTag = this.TAG_Compound;
	
		this.readByte = function(peekOnly) {return this.binaryParser.toByte(this.readBuffer(8,peekOnly))};
		this.readShort = function(peekOnly) {return this.binaryParser.toShort(this.readBuffer(16,peekOnly))};
		this.readInt = function(peekOnly) {return this.binaryParser.toInt(this.readBuffer(32),peekOnly)};
		this.readLong = function(peekOnly) {return this.binaryParser.toLong(this.readBuffer(64),peekOnly)};
		this.readFloat = function(peekOnly) {return this.binaryParser.toFloat(this.readBuffer(32),peekOnly)};
		this.readDouble = function(peekOnly) {return this.binaryParser.toDouble(this.readBuffer(64),peekOnly)};
		this.readString = function() {return this.readBuffer(8 * this.readShort())};
	
		this.writeByte = function(number) {return String.fromCharCode(number)};
		this.writeShort = function(number) {return this.binaryParser.fromShort(number)};
		this.writeInt = function(number) {return this.binaryParser.fromInt(number)};
		this.writeLong = function(number) {return this.binaryParser.fromLong(number)};
		this.writeFloat = function(number) {return this.binaryParser.fromFloat(number)};
		this.writeDouble = function(number) {return this.binaryParser.fromDouble(number)};
		this.writeString = function(string) {return this.writeShort(string.length) + string;}
		
		/**
		 * Returns string of data of a length in bits
		 * 
		 * @param {Integer}	bitLength	length of data to return in terms of number of bits
		 * @param {Bool}	peekOnly	If true, we doin't move the pointer
		 * @return {String}
		 */
		this.readBuffer = function(bitLength, peekOnly) {
			var byteLength;
			var returnData;
			
			if (typeof peekOnly == undefined) peekOnly = false;
			
			byteLength = bitLength/8;
	
			if (byteLength < 1) { 
				//Sometimes we are asked to read strings of zero length, this is not unusual for blocks like signs without text on every line
				returnData = "";
			}
			else {
				if (this.pointer + byteLength > this.binaryNbtData.length) {
					throw new Error("NbtParser.readBuffer(): Unexpectedly reached end of NBT data of length "+this.binaryNbtData.length+" (0x"+(this.binaryNbtData.length - 1).toString(16)+"). Tried reading "+byteLength+" bytes of data at position "+this.pointer+" (0x"+this.pointer.toString(16)+").");
				}
				else {
					returnData = this.binaryNbtData.substr(this.pointer, byteLength);
				}
			}
	
			if (!peekOnly) this.pointer += byteLength;
			return returnData;
		}
	
		this.decode = function(options) {
			//console.log(hexDump(options.data));
			var binaryData = options.data;
			var callback = options.success;
			var progress = options.progress;
			var updateInterval = options.updateInterval;
			var cancel = options.cancel;
			
			//Check if it's gzipped (starts with 0x1F and 0x8B):
			if (
				(binaryData.charCodeAt(0) & 0xff) == 0x1f &&
				(binaryData.charCodeAt(1) & 0xff) == 0x8b
			) {
				var t = this;
				com.mordritch.mcSim.gzip.inflateAsync({
					data: binaryData,
					success: function(data) {
						t.decodeNonGzipped(data, callback);
					},
					progressInterval: updateInterval,
					progress: function(type, progressAmount, messaging) {
						progress(type, progressAmount, messaging);
						//console.log(type, progressAmount);
					},
					cancel: cancel
				});
			}
			else {
				this.decodeNonGzipped(binaryData, callback);
			}
		}
		
		/**
		 * Decodes uncompressed NBT data
		 * 
		 * Returns as an object structured to represent the NBT data
		 * 
		 * @param	{String}	binaryNbtData
		 * @return	{Object}
		 */
		this.decodeNonGzipped = function(binaryNbtData, callback) {
			var returnData = {};
			var starterTagId;
			var starterTagName;
			
			this.binaryNbtData = binaryNbtData;
			this.pointer = 0;
			
			starterTagId = this.readByte();
	
			//I don't know if it's alpha levels in general, or my chunk extractor/decompressor, but
			//chunks seem to start with a TAG_Compound which has a name length of 0. That is, files
			//start with 0x0a0000. 
			if (this.readShort(true) == 0) {
				this.pointer += 2;
				starterTagId = this.readByte();
			}
	
	
			if (starterTagId != this.expectedStartingTag) {
				throw new Error("NbtParser.decode(): Bad starting tag for NBT data, expected 0x"+this.byteToHex(this.expectedStartingTag)+" but got 0x"+this.byteToHex(starterTagId)+".");
			}
			starterTagName = this.readString();
			
			returnData[starterTagName] = {
				"type": starterTagId,
				"payload": this.readTagData(starterTagId)
			};
			
			callback(returnData);
		}
		
		/**
		 * Returns a hex representation of a byte value
		 * 
		 * Intended for values from 0 to 255, but won't show an error for values higher, will merely return more than 2
		 * hex characters. Used in the thrown exceptions.
		 * 
		 * @param {Integer} The number to convert to hex
		 * 
		 * @return {String} Hex representation
		 */
		this.byteToHex = function(number) {
			if (number < 17) {
				return "0" + number.toString(16);
			}
			else {
				return number.toString(16);
			}
		}
		
		/**
		 * Get the tagData associated with the tag type
		 * 
		 * @param {Integer} The tag type of the data we will need to read
		 * 
		 * @return {Object} 
		 */
		this.readTagData = function(tagId) {
			switch (tagId) {
				case this.TAG_End:
					break;
				case this.TAG_Byte:
					return this.readTagData_byte();
					break;
				case this.TAG_Short:
					return this.readTagData_short();
					break;
				case this.TAG_Int:
					return this.readTagData_int();
					break;
				case this.TAG_Long:
					return this.readTagData_long();
					break;
				case this.TAG_Float:
					return this.readTagData_float();
					break;
				case this.TAG_Double:
					return this.readTagData_double();
					break;
				case this.TAG_Byte_Array:
					return this.readTagData_byteArray();
					break;
				case this.TAG_String:
					return this.readTagData_string();
					break;
				case this.TAG_List:
					return this.readTagData_list();
					break;
				case this.TAG_Compound:
					return this.readTagData_compound();
					break;
				case this.TAG_Int_Array:
					return this.readTagData_intArray();
					break;
				default:
					throw new Error("NbtParser.readTagData(): Unknown tag type 0x"+this.byteToHex(tagId)+" encountered. Current pointer position is "+this.pointer+" (0x"+this.pointer.toString(16)+").");
					break;
			}
		}
		
		this.readTagData_byte = function() {
			return this.readByte();
		}
		
		this.readTagData_short = function() {
			return this.readShort();
		}
		
		this.readTagData_int = function() {
			return this.readInt();
		}
		
		this.readTagData_long = function() {
			return this.readLong();
		}
		
		this.readTagData_float = function() {
			return this.readFloat();
		}
		
		this.readTagData_double = function() {
			return this.readDouble();
		}
		
		this.readTagData_string = function() {
			return this.readString();
		}
		
		this.readTagData_byteArray = function() {
			var byteLength = this.readInt();
			var byteString = this.readBuffer(byteLength*8);
			var byteArray = [];
	
			for (var i = 0; i < byteLength; i++) {
				byteArray.push(byteString.charCodeAt(i) & 0xff);
			}
	
			return byteArray;
		}
		
		this.readTagData_intArray = function() {
			var arrayLength = this.readInt();
			var intArray = [];
	
			for (var i = 0; i < arrayLength; i++) {
				intArray.push(this.readInt());
			}
	
			return byteArray;
		}
		
		this.readTagData_list = function() {
			var tagId = this.readByte();
			var length = this.readInt();
			var returnArray = new Array();
			
			for (var i = 0; i < length; i++) {
				returnArray.push(this.readTagData(tagId));
			}
			
			return {"ofType": tagId, "list": returnArray};
		}
		
		this.readTagData_compound = function() {
			var returnData = {};
			var tagId;
			var tagName;
			
			
			tagId = this.readByte();
			while (tagId != this.TAG_End) {
				tagName = this.readString();
				returnData[tagName] = {"type": tagId, "payload": this.readTagData(tagId)};
				tagId = this.readByte();
			}
			return returnData;
		}
	
		/**
		 * Takes a Javascript object and encodes it into NBT data 
		 * 
		 * @param	{String}	data							The object to encode, must be in expected structure
		 * @param	{Bool}		encloseInUnnamedCompoundTag		Whether or not to write the data as enclosed in a unnamed compound tag.
		 * 														It seems that Alpha level chunks do this.
		 * @return	{Bool}		gzipDeflate						Whether or not to compress it first
		 */
		this.encode = function(options) {
			var returnData = "";
			var starterTagId;
			var starterTagName;
			
			this.returnData = "";
			
			if (typeof options.encloseInUnnamedCompoundTag == "undefined")
				options.encloseInUnnamedCompoundTag = false;
			if (typeof options.gzipDeflate == "undefined")
				options.gzipDeflate = true;

			var data = options.data;
			var gzipDeflate = options.gzipDeflate;
			var encloseInUnnamedCompoundTag = options.encloseInUnnamedCompoundTag;
			
			var count = 0;
			for (starterTagName in data) {
				count++;
			}
			if (count > 1) {
				throw new Error("NbtParser.encode(): Too many elements in root node, expected 1 but found " + count + ".");
			}
			
			starterTagId = data[starterTagName].type;
			if (starterTagId != this.expectedStartingTag) {
				throw new Error("NbtParser.encode(): Bad starting tag for NBT data, expected 0x"+this.byteToHex(this.expectedStartingTag)+" but got 0x"+this.byteToHex(starterTagId)+".");
			}
			
			
			this.writeTagData_compound(data);
			
			/**
			 * Alpha chunks are enclosed in an unnamed compound tag 
			 */
			if (encloseInUnnamedCompoundTag) {
				this.returnData =
					"" + //Ensure it's a string
					this.writeByte(this.TAG_Compound) +
					this.writeShort(0) +
					this.returnData +
					this.writeByte(this.TAG_End);
			}

			
			
			if (gzipDeflate) {
				//TODO: gzip deflate the data
			}
			
			//console.log(hexDump(this.returnData));
			options.success(this.returnData);
		}
	
		/**
		 * Generate binary version of data for a tag
		 * 
		 * @param {Integer} tagId	The tag type of the data we will need to read
		 * @param {Object}	data	The data to process
		 * 
		 * @return {Object} 
		 */
		this.writeTagData = function(tagId, data) {
			switch (tagId) {
				case this.TAG_End:
					break;
				case this.TAG_Byte:
					this.writeTagData_byte(data);
					break;
				case this.TAG_Short:
					this.writeTagData_short(data);
					break;
				case this.TAG_Int:
					this.writeTagData_int(data);
					break;
				case this.TAG_Long:
					this.writeTagData_long(data);
					break;
				case this.TAG_Float:
					this.writeTagData_float(data);
					break;
				case this.TAG_Double:
					this.writeTagData_double(data);
					break;
				case this.TAG_Byte_Array:
					this.writeTagData_byteArray(data);
					break;
				case this.TAG_String:
					this.writeTagData_string(data);
					break;
				case this.TAG_List:
					this.writeTagData_list(data);
					break;
				case this.TAG_Compound:
					this.writeTagData_compound(data);
					break;
				case this.TAG_Int_Array:
					this.writeTagData_intArray(data);
					break;
				default:
					throw new Error("NbtParser.writeTagData(): Unknown tag type 0x"+this.byteToHex(tagId)+" encountered.");
					break;
			}
		}
		
		this.writeTagData_byte = function(number) {
			this.returnData += this.writeByte(number);
		}
		
		this.writeTagData_short = function(number) {
			this.returnData += this.writeShort(number);
		}
		
		this.writeTagData_int = function(number) {
			this.returnData += this.writeInt(number);
		}
		
		this.writeTagData_long = function(number) {
			this.returnData += this.writeLong(number);
		}
		
		this.writeTagData_float = function(number) {
			this.returnData += this.writeFloat(number);
		}
		
		this.writeTagData_double = function(number) {
			this.returnData += this.writeDouble(number);
		}
		

		this.writeTagData_byteArray = function(byteArray) {
			this.returnData += this.writeInt(byteArray.length);
			for (var i=0; i < byteArray.length;	i++) {
				this.returnData += String.fromCharCode(byteArray[i]);
			};
		}
		
		this.writeTagData_intArray = function(intArray) {
			this.returnData += this.writeInt(intArray.length);
			for (var i=0; i < intArray.length;	i++) {
				this.returnData +=  this.writeInt(intArray[i]);
			};
		}
		
		this.writeTagData_string = function(string) {
			this.returnData += this.writeString(string);
		}
		
		this.writeTagData_list = function(data) {
			var ofTagId = data.ofType;
			var length = data.list.length;

			this.returnData += this.writeByte(ofTagId) + this.writeInt(length);

			for (var i=0; i<length; i++) {
				this.writeTagData(ofTagId, data.list[i]);
			}
		}
		
		this.writeTagData_compound = function(data) {
			for (var tagName in data) {
					//if (data[tagName].type == 7) continue;
					var before = this.returnData.length;
					this.returnData += this.writeByte(data[tagName].type);
					this.returnData += this.writeString(tagName);
					this.writeTagData(data[tagName].type, data[tagName].payload);
					//console.log("tag: %s, name: %s(%s), before: %s, after: %s, difference: %s, difference (excluding tag type and name): %s", data[tagName].type, tagName, tagName.length, before, this.returnData.length, this.returnData.length - before, this.returnData.length - before - 3 - tagName.length);
			}
			this.returnData += this.writeByte(this.TAG_End);
		}
	}

	com.mordritch.mcSim.NbtParser = NbtParser;
})();