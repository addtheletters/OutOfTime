var hbsrc = document.getElementById("result-template").innerHTML;
var hbtemplate = Handlebars.compile(hbsrc);

var HOUR12TIME = true;

function formatHourMinute(rawtime){
	if(!rawtime){
		return "[No time]";
	}
	var t = {};
	t.bhrs = parseInt(rawtime.slice(0, -2));
	t.bmin = parseInt(rawtime.slice(-2));
	t.half;
	if(HOUR12TIME){
		if(t.bhrs > 12){
			t.bhrs = t.bhrs - 12;
			t.half = "PM";
		}
		else{
			t.half = "AM";
		}
	}
	return t.bhrs.toString() + ":" + t.bmin.toString() + ( (t.bmin == 0) ? "0" : "" )  + ( t.half ? " " + t.half : "");
}

function halfOfDay(formattedTime){
	var half = formattedTime.slice(-2);
	if(half === "AM" || half === "PM"){
		return half;
	}
	else{
		return null;
	}
}

function formatTime(time){
	if(!time.start && !time.end){
		return "[No time]";
	}
	var f1 = formatHourMinute(time.start);
	var f2 = formatHourMinute(time.end);
	var h1 = halfOfDay(f1);
	var h2 = halfOfDay(f2);
	if( (h1 && h2) && (h1 === h2) ){ // starts and ends on same half of day
		f1 = f1.slice(0, -3); // only show which half after the second time
	}
	return f1 + " - " + f2;
}

function formatCompleteTime(time){
	return ((time.raw_days && time.raw_days.length > 0) ? (time.raw_days + " | ") : ("")) + formatTime(time);
}

Handlebars.registerHelper('hourminute', formatHourMinute);
Handlebars.registerHelper('timerange', formatTime);
Handlebars.registerHelper('completetime', formatCompleteTime);

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
