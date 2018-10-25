(function(){

	var namespace = window.com.mordritch.mcSim;
	var zip_inflate = new gzipInflater().zip_inflate;
	var zip_inflate_async = namespace.inflateAsync;

	var zip_deflate = namespace.deflate;
	var zip_deflate_async = namespace.deflateAsync;
	
	var readByte = function(input, offset) {
		return input.charCodeAt(offset) & 0xff;
	};
	
	var writeByte = function(input) {
		return String.fromCharCode(input);
	};
	
	var readUInt32 = function(input, offset) {
		returnValue = (
			((readByte(input, offset +3) << 24)) |
			(readByte(input, offset +2) << 16) |
			(readByte(input, offset +1) << 8) |
			(readByte(input, offset))
		);
		//ECMA bitwise operations work as signed 32 bit ints, will need conversion
		return (returnValue < 0) ? returnValue + 0x100000000 : returnValue;
	};
	
	var writeUInt32 = function(input) {
		if (input < 0 || input > 0xffffffff)
			throw("gzip.writeUInt32() - Value ("+input+") out of range, but be from 0 to " +0xffffffff);
		
		return "" +
			String.fromCharCode(input >> 0 & 0xff) +
			String.fromCharCode(input >> 8 & 0xff) +
			String.fromCharCode(input >> 16 & 0xff) +
			String.fromCharCode(input >> 24 & 0xff);
	};
	
	var hasGzipIdentifier = function(input) {
		return (
			readByte(input.substr(0,1)) == GZIP_ID1 &&
			readByte(input.substr(1,1)) == GZIP_ID2
		);
	};
	
	var GZIP_ID1 = 0x1f; //GZIP identifier, all GZIP files start with these two bytes
	var GZIP_ID2 = 0x8b;
	var COMPRESSION_METHOD = 0x08; //0x08 = Deflate
	var GZIP_FLAGS = 0x00;
	var COMPRESSION_FLAGS = 0x00;
	var OS_IDENTIFIER = 0xff; //Unknown operating system
	
	var BIT_FLAG_FTEXT = 0;
	var BIT_FLAG_FHCRC = 1;
	var BIT_FLAG_FEXTRA = 2;
	var BIT_FLAG_FNAME = 3;
	var BIT_FLAG_FCOMMENT = 4;
	
	function readZeroTerminatedString(input, offset) {
		var i = offset;
		var returnString = "";
		while (readByte(input.substr(i, 1)) != 0x00) {
			if (i > input.length) {
				throw("gzip.readZeroTerminatedString() - Reached end of file while trying to read zero terminated string");
			}
			returnString+= input.substr(i, 1);
			i++;
		}
		return returnString;
	} 
	
	var writeHeader = function() {
		var unixTimeStamp = Math.round(new Date().getTime() / 1000);
		
		var header = 
			writeByte(GZIP_ID1) + 					// IDentification byte 1
			writeByte(GZIP_ID2) + 					// IDentification byte 2
			writeByte(COMPRESSION_METHOD) +			// Compression Method
			writeByte(GZIP_FLAGS) + 				// Flags
			writeUInt32(unixTimeStamp) + 			// Modification time
			writeByte(COMPRESSION_FLAGS) +			// Extra Flags
			writeByte(OS_IDENTIFIER);				// Operating System
		
		return header;
	};
	

	function hasFlag(input, flag) {
		return (input & flag == flag);
	}

	var deflate = function(input) {
		var header =
			writeHeader();
		
		var deflatedData =
			zip_deflate(input);

		var footer = 
			writeUInt32(crc32(input)) +	// CRC32 of the input file
			writeUInt32(input.length);	// Length of the input file
			
		return header + deflatedData + footer;
	};
	
	var deflateAsync = function(options) {
		var input = options.data;
		var successCallback = options.success;
		var progressCallback = options.progress;
		var cancelCallback = options.cancel;

		zip_deflate_async({
			data: input,
			success: function(deflatedData, returnedCrc32) {
				var header = 
					writeHeader();
				
				var footer = 
					writeUInt32(crc32(input)) +	// CRC32 of the input file
					writeUInt32(input.length);	// Length of the input file
					
				var returnData = header + deflatedData + footer;
					 
				successCallback(returnData);
			},
			progress: function(currentTask, progress, messaging) {
				progressCallback(currentTask, progress, messaging);
			},
			cancel: function() {
				cancelCallback();
			}
		});
	};
	
	
	var inflate = function(input) {
		var pointer = 0;
		var startTime = new Date().getTime();
		
		if (!hasGzipIdentifier(input)) {
			throw("gzip.inflate() - File not recognized as GZIP");
		}
		pointer += 2;
		
		var method = readByte(input, pointer);
		switch (method) {
			case COMPRESSION_METHOD:
				break;
			default:
				throw("gzip.inflate() - Unknown compression method used");
		}
		pointer += 1;
		
		var flagsByte = readByte(input, pointer);
		pointer += 1;
		
		if (hasFlag(flagsByte, BIT_FLAG_FEXTRA)) {
			//gzip header has extra fields present, reading of which not implemented
			throw("gzip.inflate() - Extra fields flag is set, not supported in this implementation.");
		}

		if (hasFlag(flagsByte, BIT_FLAG_FNAME)) {
			//Has a file name
			console.log("has nmae");
			pointer += readZeroTerminatedString(input, offset).length + 1;
		}
		
		if (hasFlag(flagsByte, BIT_FLAG_FCOMMENT)) {
			//Has a comment
			console.log("has comment");
			pointer += readZeroTerminatedString(input, offset).length + 1;
		}
		
		if (hasFlag(flagsByte, BIT_FLAG_FHCRC)) {
			//Has a CRC16 of the header data immediately before the compressed data, ignored by this implementation
			pointer += 2;
		}
		
		pointer += 4; //the date and time the original file was modified
		pointer += 2; //the extra field data
		
		var compressedDataLength = input.length - 8 - pointer;
		var compressedData = input.substr(pointer, compressedDataLength);
		
		var uncompressedData = zip_inflate(compressedData);
		pointer += compressedDataLength;
		
		var uncompressedCrc32 = readUInt32(input, pointer);
		pointer += 4;
		
		var uncompressedLength = readUInt32(input, pointer);
		pointer += 4;
		
		if (uncompressedLength != uncompressedData.length) {
			throw("gzip.inflate() - Uncompressed data ("+uncompressedData.length+") length differs from original uncompressed data length ("+uncompressedLength+")");
		}
		
		var calculated_crc32 = crc32(uncompressedData);
		
		if (calculated_crc32 != uncompressedCrc32) {
			console.log(hexDump(uncompressedData));
			throw("gzip.inflate() - CRC32 fail. Calculated value: "+calculated_crc32+", Recorded Value: "+uncompressedCrc32);
		}
		
		console.log("gzip.inflate() - Finished in %sms.", new Date().getTime() - startTime);
		
		return uncompressedData;
	};
	
	function inflateAsync(options) {
	    if (typeof options.data == "undefined")
	    	throw("inflateAsync() - .data not set");
	    if (typeof options.success != "function")
	    	throw("inflateAsync() - .success not set or not a function"); 
	    if (typeof options.progress != "undefined" && typeof options.progress != "function")
	    	throw("inflateAsync() - .progress not a function");

		var pointer = 0;
		var input = options.data;
		var callback = options.success;
		
		//var startTime = new Date().getTime();
		
		if (!hasGzipIdentifier(input)) {
			throw("gzip.inflate() - File not recognized as GZIP");
		}
		pointer += 2;
		
		var method = readByte(input, pointer);
		switch (method) {
			case COMPRESSION_METHOD:
				break;
			default:
				throw("gzip.inflate() - Unknown compression method used");
		}
		pointer += 1;
		
		var flagsByte = readByte(input, pointer);
		pointer += 1;
		
		if (hasFlag(flagsByte, BIT_FLAG_FEXTRA)) {
			//gzip header has extra fields present, reading of which not implemented
			throw("gzip.inflate() - Extra fields flag is set, not supported in this implementation");
		}

		if (hasFlag(flagsByte, BIT_FLAG_FNAME)) {
			//Has a file name
			console.log("has name");
			pointer += readZeroTerminatedString(input, offset).length + 1;
		}
		
		if (hasFlag(flagsByte, BIT_FLAG_FCOMMENT)) {
			//Has a comment
			console.log("has comment");
			pointer += readZeroTerminatedString(input, offset).length + 1;
		}
		
		if (hasFlag(flagsByte, BIT_FLAG_FHCRC)) {
			//Has a CRC16 of the header data immediately before the compressed data, ignored by this implementation
			pointer += 2;
		}
		
		pointer += 4; //the date and time the original file was modified
		pointer += 2; //the extra field data
		
		var compressedDataLength = input.length - 8 - pointer;
		var compressedData = input.substr(pointer, compressedDataLength);
		
		pointer += compressedDataLength;

		var uncompressedCrc32 = readUInt32(input, pointer);
		pointer += 4;
		
		var uncompressedLength = readUInt32(input, pointer);
		pointer += 4;
		
		var gzip = new gzipInflater();
		gzip.inflateAsync({
			data: compressedData,
			progress: function(type, progressAmount, messaging) {
				options.progress("Inflating GZIP data...", Math.round((progressAmount/uncompressedLength)*100)+"%", messaging);
			},
			progressInterval: options.progressInterval,
			success: function(uncompressedData, crc32_response) {
				if (uncompressedLength != uncompressedData.length) {
					throw("gzip.inflate() - Uncompressed data ("+uncompressedData.length+") length differs from original uncompressed data length ("+uncompressedLength+")");
				}
				console.log("Data length correct.");
				if (crc32_response != uncompressedCrc32) {
					throw("gzip.inflate() - CRC32 fail. Stored: %s, Computed: %s", uncompressedCrc32, crc32_response);
				}
				//console.log("CRC32 pass.");
				callback(uncompressedData);
			},
			cancel: options.cancel
		});
		//console.log("gzip.inflate() - Finished in %sms.", new Date().getTime() - startTime);
	}
	
	// Inspired by: http://www.webtoolkit.info/javascript-crc32.html
	// - Removed unicode support
	// - Improved performance with numeric array lookup instead of substrings
	
	var crc32 = function(str) {
		var crc32_table = [0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685, 2657392035, 249268274, 2044508324, 3772115230, 2547177864, 162941995, 2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648, 2227061214, 450548861, 1843258603, 4107580753, 2211677639, 325883990, 1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755, 2366115317, 997073096, 1281953886, 3579855332, 2724688242, 1006888145, 1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206, 2898065728, 853044451, 1172266101, 3705015759, 2882616665, 651767980, 1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705, 3099436303, 671266974, 1594198024, 3322730930, 2970347812, 795835527, 1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772, 4023717930, 1907459465, 112637215, 2680153253, 3904427059, 2013776290, 251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719, 3865271297, 1802195444, 476864866, 2238001368, 4066508878, 1812370925, 453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202, 4240017532, 1658658271, 366619977, 2362670323, 4224994405, 1303535960, 984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733, 3554079995, 1131014506, 879679996, 2909243462, 3663771856, 1141124467, 855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048, 3373015174, 1466479909, 544179635, 3110523913, 3462522015, 1591671054, 702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443, 3233442989, 3988292384, 2596254646, 62317068, 1957810842, 3939845945, 2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430, 2053790376, 3826175755, 2466906013, 167816743, 2097651377, 4027552580, 2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225, 1852507879, 4275313526, 2312317920, 282753626, 1742555852, 4189708143, 2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732, 1340076626, 3518719985, 2797360999, 1068828381, 1219638859, 3624741850, 2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135, 1181335161, 3412177804, 3160834842, 628085408, 1382605366, 3423369109, 3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954, 1555261956, 3268935591, 3050360625, 752459403, 1541320221, 2607071920, 3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877, 83908371, 2512341634, 3803740692, 2075208622, 213261112, 2463272603, 3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992, 534414190, 2176718541, 4139329115, 1873836001, 414664567, 2282248934, 4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795, 376229701, 2685067896, 3608007406, 1308918612, 956543938, 2808555105, 3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270, 936918000, 2847714899, 3736837829, 1202900863, 817233897, 3183342108, 3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449, 601450431, 3009837614, 3294710456, 1567103746, 711928724, 3020668471, 3272380065, 1510334235, 755167117];

		var crc = 0 ^ (-1);
		var length = str.length;
		 
		for(var i=0; i<length; i++) {
			crc = (crc >>> 8) ^ crc32_table[(crc ^ str.charCodeAt(i)) & 0xFF];
		}
		
		crc = crc ^ (-1);
		crc = (crc < 0) ? crc + 0x100000000 : crc;
		
	    return crc;
	};
	
	namespace.gzip = {
		deflate: deflate,
		deflateAsync: deflateAsync,
		inflate: inflate,
		inflateAsync: inflateAsync
	};

})();