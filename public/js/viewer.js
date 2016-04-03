

function runSearch( str ){
	console.log("searching for", str);
	var xhr = new XMLHttpRequest();
	xhr.onload = function(){
		if(this.status != 200){
			console.log("There was a problem contacting the server.", this.status);
		}
		var res = JSON.parse(xhr.responseText);
		if(res.ok){
			console.log("Search completed.");
			console.log(res);
			
		} else {
			console.log("Search failed: " + res.reason, 4000);
		}
	};
	xhr.open("POST", "/search/all", true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({searchterms:str}));
}

document.addEventListener("DOMContentLoaded", function(){
	document.getElementById("search_button").onclick = function(){ runSearch( document.getElementById("search").value ) };
});
