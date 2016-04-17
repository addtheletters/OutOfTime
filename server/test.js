var detail = require("./detail.js");

var raw1 = "HELLO AND (chees AND (( crackers OR science ) OR what? I don't know exactly.) AND this is cool.)";
var raw2 = "111 OR 222 AND 333"
var parsed1 = detail.parseReqs(raw1);
var parsed2 = detail.parseReqs(raw2);
console.log( "raw is:" , raw2 );
console.log( "parsed is:", JSON.stringify(parsed2, null, 4) );
//console.log("we did a testing thing");
