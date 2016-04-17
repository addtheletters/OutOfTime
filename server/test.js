var detail = require("./detail.js");

var raw1 = "HELLO AND (chees AND (( crackers OR science ) OR what? I don't know exactly.) AND this is cool.)";
var raw2 = "MATH 214 OR 222 AND MATH 211"
var parsed1 = detail.parseReqs(raw1);
var parsed2 = detail.parseReqs(raw2);
console.log("r1", raw1);
console.log("p1", JSON.stringify(parsed1, null, 4));
console.log( "raw is:" , raw2 );
console.log( "parsed is:", JSON.stringify(parsed2, null, 4) );
//console.log("we did a testing thing");

var taken = ["MATH 211", "MATH 213", "MATH 214"];
var auditres = detail.audit( parsed2, taken );
console.log("audit says: requirements still unsatisfied?",JSON.stringify(auditres, null, 4));


