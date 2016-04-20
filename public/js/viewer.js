var hbsrc = document.getElementById("result-template").innerHTML;
var hbtemplate = Handlebars.compile(hbsrc);

var HOUR24TIME = false;

//var util = require('./util.js');

function timeFormat( time ){
	return util.time.formatCompleteTime( time, HOUR24TIME );
}

Handlebars.registerHelper('completetime', timeFormat);

var lastresult;
var selected = [];
var result_id_prefix = "result-";

function displayResults( entries, term ){
	// for(var i = 0; i < entries.courses.length; i++){
	// 	prepareForDisplay(entries.courses[i]);
	// }
	if(entries.ok && entries.courses.length > 0){
		showResult( hbtemplate(entries), "Showing results from term: " + util.term.getReadableTerm(term) );
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

function showResult( str, caption ){
	var result_caption = document.getElementById("results-caption");
	result_caption.innerHTML = caption || ""; 
	var results_div = document.getElementById("results");
	results_div.innerHTML = str;
}

function getCourseDOM( index ){
	return document.getElementById(result_id_prefix + index);
}

// TODO possibly differentiate between 'showing detail' and 'selected' states
function toggleSelected( index ){
	if( selected.indexOf(index) < 0 ){
		selectOn(index);
	}
	else{
		selectOff(index);
	}
}

function selectOn( index ){
	var crse = getCourse(index);
	selected.push(index);
	getCourseDOM(index).classList.add("selected");
	console.log(crse);
	return crse;
}

function selectOff( index ){
	var crse = getCourse(index);
	var si = selected.indexOf( index );
	if(si > -1){
		selected.splice(si, 1);
	}
	getCourseDOM(index).classList.remove("selected");
	return si;
}

function getCourse( result_index ){
	//var cdex = parseInt(resultID.split("-")[1]);
	return lastresult.courses[result_index];
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
			showResult("[Connection status issue: "+JSON.stringify(this.status)+"]");
		}
		var res = JSON.parse(xhr.responseText);
		if(res.ok){
			console.log("Search completed.");
			console.log(res);
			displayResults(res, term);
			lastresult = res;
			selected = [];
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
