<?php
$fileName = "TestSchematic.schematic";

/**
 * Deflates a gzip compressed string
 * 
 * Not used in this page, but one may find it usefull for reading files from a database. This function will be
 * reportedly built into PHP as of version 6 as "gzdecode()".
 * 
 * @param 	{String}  $data
 * @return	{String}
 */
function gzdecode_prePhp6($data){
    $g=tempnam('/tmp','ff');
    @file_put_contents($g,$data);
    ob_start();
    readgzfile($g);
    $d=ob_get_clean();
    return $d;
}

/**
 * Reads a file and deflates it if it's gzencoded.
 * 
 * @param	{String} $filename  The name of the file to read
 * @return	{String}
 */
function readFileAsBinary($filename) {
    $handle = gzopen($filename, "rb"); //using gzopen auto detects whether or not the file is compressed
    $contents = stream_get_contents($handle);
    
    return $contents;
}

$fileNameWithPath = getcwd() . "/../resources/" . $fileName;

/*
 * ob_start("ob_gzhandler") enables HTTP GZIP compression
 * 
 * Be aware that if a PHP error occurs, you may get nothing returned by the PHP script, it just outputs a completely
 * blank page, so if you are trying to troubleshoot a problem, comment out the line.
 * 
 * It's well worth compressing the output though, for example a 256KB file could be 13MB when uncompressed. 
 * 
 */ 
ob_start("ob_gzhandler");
echo readFileAsBinary($fileNameWithPath);
?>