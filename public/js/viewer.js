var result_hbsrc = document.getElementById("result-template").innerHTML;
var detail_hbsrc = document.getElementById("detail-template").innerHTML;
var result_hbt = Handlebars.compile(result_hbsrc);
var detail_hbt = Handlebars.compile(detail_hbsrc);

var HOUR24TIME = false;

//var util = require('./util.js');

function timeFormat( time ){
	return util.time.formatCompleteTime( time, HOUR24TIME );
}

function listAttributes( attributes ){
	if(!attributes || attributes.length < 1){
		return "[None]";
	}
	var out = "<ul>";
	for(var i = 0; i < attributes.length; i++){
		out += "<li class='attribute-li'>" + attributes[i] + "</li>";
	}
	out += "</ul>";
	return attributes;
}

function spaceFormat( space ){
	return (space.status_ok ? "Open" : "Closed") + " ("+space.available+" seat(s) available out of "+space.capacity+".)";
}

Handlebars.registerHelper('completetime', timeFormat);
Handlebars.registerHelper('attributelist', listAttributes);
Handlebars.registerHelper('examinespace', spaceFormat);

var lastresult;
var selected = [];
var detailed = [];
var result_id_prefix = "result-";

function displayResults( entries, term ){
	// for(var i = 0; i < entries.courses.length; i++){
	// 	prepareForDisplay(entries.courses[i]);
	// }
	if(entries.ok && entries.courses.length > 0){
		showResult( result_hbt(entries), "Showing results from term: " + util.term.getReadableTerm(term) );
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

function toggleDetail(index){
	if(detailed.indexOf(index) < 0){
		showDetail(index);
	}
	else{
		hideDetail(index);
	}
}

function showDetail( index ){
	var detbox = document.getElementById("details-box");
	var cinfo = getCourse(index);
	if(detailed.indexOf(index) < 0){
		detailed.push(index);
		cinfo.index = index;
		detbox.innerHTML =  detail_hbt(cinfo) + detbox.innerHTML;
	}
	detbox.classList.remove("hidden");
	var dom = getCourseDOM(index);
	if(dom)
		dom.classList.add("detail-showing");
	return cinfo;
}

function hideDetail( index ){
	var si = detailed.indexOf(index);
	if(si > -1){
		detailed.splice(si, 1);
	}
	document.getElementById("details-box").removeChild( document.getElementById("detail-" + index ) );
	var dom = getCourseDOM(index);
	if(dom)
		dom.classList.remove("detail-showing");
	return si;
}

function closeDetail(){
	document.getElementById("details-box").classList.add("hidden");
}

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
	if(selected.indexOf(index) < 0){
		selected.push(index);
	}
	var dom = getCourseDOM(index);
	if(dom)
		dom.classList.add("selected");
	console.log(crse);
	return crse;
}

function selectOff( index ){
	var crse = getCourse(index);
	var si = selected.indexOf( index );
	if(si > -1){
		selected.splice(si, 1);
	}
	var dom = getCourseDOM(index);
	if(dom)
		dom.classList.remove("selected");
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

function clearSelection(){
	var st = selected.slice(0);
	for(var i = 0; i < st.length; i++){
		selectOff(st[i]);
	}
	selected = [];
}

function clearDetail(){
	var dt = detailed.slice(0);
	for(var i = 0; i < dt.length; i++){
		hideDetail(dt[i]);
	}
	closeDetail();
	document.getElementById("details-box").innerHTML = "";
	detailed = [];
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
			clearSelection();
			clearDetail();
			displayResults(res, term);
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
