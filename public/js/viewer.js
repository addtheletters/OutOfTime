var hbsrc = document.getElementById("result-template").innerHTML;
var hbtemplate = Handlebars.compile(hbsrc);

var HOUR24TIME = false;

//var util = require('./util.js');

function timeFormat( time ){
	return util.time.formatCompleteTime( time, HOUR24TIME );
}

Handlebars.registerHelper('completetime', timeFormat);

var lastresult;

function displayResults( entries ){
	// for(var i = 0; i < entries.courses.length; i++){
	// 	prepareForDisplay(entries.courses[i]);
	// }
	if(entries.ok && entries.courses.length > 0){
		showResult( hbtemplate(entries) );
	}
	else{
		showResult("<span>[No results found.]</span>");
	}
}

function searchKeyPress(e){
    e = e || window.event;
    if (e.keyCode == 13){ // if enter is pressed, it's the same thing as clicking the search button
        document.getElementById('search-button').click();
        return false;
    }
    return true;
}

function showResult( str ){
	var result_box = document.getElementById("results");
	result_box.innerHTML = str;
}

function getTerm(){
	var ts = document.getElementById("term-select");
	return ts.value;
}

function runSearch( str, term ){
	console.log("searching for", str, "in term", term);
	if(!term){
		showResult("[No term selected.]");
	}
	showResult("[Searching...]");

	var xhr = new XMLHttpRequest();
	xhr.onload = function(){
		if(this.status != 200){
			console.log("There was a problem contacting the server.", this.status);
		}
		var res = JSON.parse(xhr.responseText);
		if(res.ok){
			console.log("Search completed.");
			console.log(res);
			displayResults(res);
			lastresult = res;
		} else {
			console.log("Search failed: " + res.reason);
			showResult("[Search failed: "+JSON.stringify(res.reason)+"]");
		}
	};
	xhr.open("POST", "/search/" + term, true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({searchtext:str}));
}

document.addEventListener("DOMContentLoaded", function(){
	document.getElementById("search-button").onclick = function(){ runSearch( document.getElementById("search").value, getTerm() ) };
	document.getElementById("search").onkeypress = searchKeyPress;
});
