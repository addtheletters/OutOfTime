var scrape = {};

var request = require('request');
var cheerio = require('cheerio');
var course  = require('./course.js');
var detail  = require('./detail.js');

(function(lib){

	lib.COURSE_URL = "https://courselist.wm.edu/courselist/courseinfo/searchresults"; 
	lib.DETAIL_URL = "https://courselist.wm.edu/courselist/courseinfo/addInfo";
	lib.PARAMS_URL = "https://courselist.wm.edu/courselist/";

	lib.courses = function( form, callback ){
	    request.post({url:lib.COURSE_URL, form:form}, function(error, response, html){
	        if(!error){
	            var $ = cheerio.load(html);
	            var table = $("#results table"); // gets all the rows!
	            
	            var columns = table.find("thead th").map(function(){
	                return $(this).text().trim();
	            }).get();

	            console.log(columns);

	            var data = [];
	            table.find("tbody").children().each(function(index){
	                if(index % columns.length == 0){
	                    data.push( {} );
	                }
	                var coursekey = columns[index % columns.length];
	                data[Math.floor(index / columns.length)][coursekey] = $(this).text().trim();
	            });

	            var parsed = [];

	            for(var i = 0; i < data.length; i++){
	                console.log("Confirmed course: " + data[i]["COURSE ID"]);
	                parsed.push(course.parse(data[i]));
	            }

	            callback(parsed);
	        }
	        else{
	        	callback({error:true, reason:error});
	        }
	    });
	   // console.log("Made a request to " + lib.COURSE_URL );
	};

	lib.details = function( queryParams, callback ){
		request.get({uri:lib.DETAIL_URL, qs:queryParams}, function(error, response, html){
	        if(!error){
				var $    = cheerio.load(html);
				var info = $("#addinfo");
				var fc   = info.children().first();
				var lc   = info.children().last();

	            var raw = {
	                crn:queryParams.fcrn,
	                term:queryParams.fterm,
	                /*maybe don't need year or season; maybe need day and time*/
	            };
	            var lastkey = null;

	            // TODO might want to store the retreived course name too

	            fc.find("tbody").children().each(function(index){
	                // this odd control flow is because of a random extra row under prereqs which we want to ignore
	                //console.log("child " + index, $(this).html());
	                if((index == 0) || (index > 1 && index % 2 == 1)){
	                    lastkey = $(this).text().replace(/:/, "").trim();
	                }
	                else{
	                    if(index > 1){
	                        raw[lastkey] = $(this).text().trim();
	                    }
	                }
	            });

	            lc.children().each(function(index){
	                //console.log("child " + index, $(this).html());
	                if(index > 0){
	                    var rkey = $(this).children().first().text().replace(/:/, "").trim();
	                    if( rkey.length > 0 ){
	                        raw[ rkey ] = $(this).children().last().text();
	                    }
	                }
	            });

	            var parsed = detail.parse(raw);
	            callback( parsed );
	        }
	        else{
	            console.log("Something went wrong with get request:", error);
	            callback({error:error});
	        }
	    });
	};

	lib.params = function( type, callback ){
		var ids = {
	        term:"term_code",
	        subject:"term_subj",
	        attribute:"attr",
	        status:"status",
	        level:"levl", // not displayed in OCL results (would need to tag ourselves by retreiving results for each level)
	        part_of_term:"ptrm", // not displayed in OCL results
	    }; // could load this from /public/json/params.json

	    request.get({uri:lib.PARAMS_URL}, function(error, response, html){
	        if(!error){
	            var $ = cheerio.load(html);
	            //console.log("found html", html);

	            if(!ids[type]){
	                callback({error:"Parameter type did not exist: " + type});
	                return;
	            }

	            var select = $("#"+ids[type]);

	            var options = {
	                meta:{
	                    param_id:ids[type],
	                    param_raw:type,
	                    keyvalue_list:[]
	                },
	            };

	            select.children().each(function(index){
	                var ckey = $(this).val();
	                var cval = $(this).text();
	                options[ckey] = cval; // this may not be necessary and using it seems like a bad idea
	                // because it will break if the ckey has an incompatible-with-database key (character like . of $ is used)
	                // options.value_list.push($(this).text());
	                // options.key_list.push($(this).val());
	                options.meta.keyvalue_list.push( {key:ckey, value:cval} );
	            });

	            callback( options );
	        }
	        else{
	            console.log("Something went wrong. " + error);
	            callback({error:error});
	        }
	    });
	};

})(scrape);

exports = module.exports = scrape;
