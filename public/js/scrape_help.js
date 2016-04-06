var hbsrc = document.getElementById("keyval-list-template").innerHTML;
var hbtemplate = Handlebars.compile(hbsrc);

Handlebars.registerHelper('list', function(items, options) {
	var out = "<ul>";
	for(var i=0, l=items.length; i<l; i++) {
		out = out + "<li>" + options.fn(items[i]) + "</li>";
	}
	return out + "</ul>";
});

function grabJSON( filename, callback ){
	var xhr = new XMLHttpRequest();
	xhr.onload = function(){
		if(this.status != 200){
			console.log("There was a problem contacting the server.", this.status);
		}
		var res = JSON.parse(xhr.responseText);
		if(res){
			console.log("Got JSON of ", filename);
			console.log(res);
			if(callback){
				callback(res);
			}
		} else {
			console.log("Failure to get json ", filename);
		}
	};
	xhr.open("GET", "/json/"+filename, true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send();
}

// generate key-value object
// This shouldn't be necessary with the adjustment in server.js that does this right after the scrape
function generateKVOS( obj ){
	if(obj.keyvalue_list){
		console.log("object already has keyvalue_list");
		return obj;
	}
	if(obj.key_list && obj.value_list){
		obj.keyvalue_list = [];
		for(var i = 0; i < Math.min(obj.value_list.length, obj.key_list.length); i++){
			obj.keyvalue_list.push({key:obj.key_list[i], value:obj.value_list[i]});
		}
	}
	else{
		console.log("failed to generate keyvalue list for object (lacking key or value list)");
	}
	return obj;
}

function onParams( pobj ){
	var pbox = document.getElementById("param-list");
	pbox.innerHTML = hbtemplate( generateKVOS(pobj.meta) );
}

function onSubjects( sobj ){
	var sbox = document.getElementById("subj-list");
	sbox.innerHTML = hbtemplate( generateKVOS(sobj.meta) );
}

document.addEventListener("DOMContentLoaded", function(){
	grabJSON("params.json", onParams);
	grabJSON("subjects.json", onSubjects);
});

