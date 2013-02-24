/*
*/
function byteToHex(number) {
		if (number < 16) {
			return "0" + number.toString(16);
		}
		else {
			return number.toString(16);
		}
}

function dumpHex(data) {
	var binaryParser = new BinaryParser(false, false);
	var dumpStr = new String();
	
	for (var i=0; i < data.length; i++) {
		
		var byteData = data.substr(i, 1);
		
		dumpStr += byteToHex(binaryParser.toByte(byteData)) + " ";
		if (dumpStr.length >= 3*16) {
			console.log(dumpStr);
			dumpStr = "";
		}
	}
	
	if (dumpStr.length > 0) console.log(dumpStr); 
}


//Init the name space:
window["com"] = {mordritch: {mcSim:{}}};

$(document).ready(function () {
	$.ajax({
		url: 'testSchematic.schematic.bin',
		beforeSend: function(xhr) {
			xhr.overrideMimeType('text/plain; charset=x-user-defined'); //Unless set, charAtCode doesn't always return the expected result
		},
		success: function(data) {
			onSuccess(data);
		}
	});
});

function logOut(text) {
	$("#feedback").append(text + "<br/>");
}

function onSuccess(data) {
	var startTime = new Date().getTime();
	
	/*
	var gzip = com.mordritch.mcSim.gzip;
	
	//inflate:
	var inflatedData = gzip.inflate(data)
	
	//deflate:
	var deflatedData = gzip.deflate(inflatedData)
	*/
	

	window["nbtData"] = new com.mordritch.mcSim.NbtParser().decode(data);
	var diffTime = new Date().getTime() - startTime;
	
	window["schematic"] = new com.mordritch.mcSim.World_Schematic(window["nbtData"]);
	
	logOut("Loaded " + data.length + " bytes in "+diffTime+"ms.");
	
	logOut("X size: " + schematic.getSizeX() + " (X increases East, decreases West)");
	logOut("Y size: " + schematic.getSizeY() + " (Y increases upwards, decreases downwards)");
	logOut("Z size: " + schematic.getSizeZ() + " (Z increases South, decreases North)");
	
	preview();
}

function preview() {
	var preString = "";
	var blockID;
	
	preString += "+";
	for (var x = 0; x < schematic.getSizeX(); x++) {
		preString += "--";
	}
	preString += "+\n";
	
	for (var z = 0; z < schematic.getSizeZ(); z++) {
		preString += "|";
		for (var x = 0; x < schematic.getSizeX(); x++) {
			blockID = schematic.getBlockId(x,0,z);
			if (blockID == 0) preString += "  ";
			if (blockID > 0 && blockID < 16) preString += "0" + blockID.toString(16);
			if (blockID >= 16) preString += blockID.toString(16);
		}
		preString += "|\n";
	}

	preString += "+";
	for (var x = 0; x < schematic.getSizeX(); x++) {
		preString += "--";
	}
	preString += "+\n";
	
	$("#preview").html(preString); 
}
