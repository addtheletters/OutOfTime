var search = {};

var db = require('mongoskin').db('mongodb://localhost:27017/courses');
var coursecolle = "test1";

(function(lib){
	lib.courses = function( searchtext, callback ){
		console.log("searching for ", searchtext);
	    var terms    = searchtext.split(/\s+/).filter((tkn)=>(tkn.length > 0)); // split on whitespace; remove no-length tokens
	    var possible = []; // results to return
	    var pkeys    = []; // keep track of what has been put in results to avoid duplicates
	    var howmany  = terms.length; // count how many of our queries are still pending
	    // when this count reaches 0 we know all queries are done so we can send the response
	    
	    // This loop queries for each term given individually rather than let mongodb do its thing
	    // and search for them all at once. This doesn't create any improvements ATM
	    // but could be tweaked to allow for more general search terms to be
	    // pre-processed (8:00 converted to the database-friendly 0800 for example).

	    if(terms.length <= 0){
	    	callback([]);
	    }

	    for(var i = 0; i < terms.length; i++){
	        db.collection(coursecolle).find({$text:{$search:terms[i]}}, function(err, result){
	            if(err){
	                console.log("error in search ", err);
	                callback( {error:err} );
	            }
	            if(result){
	                result.toArray(function(errr, result){
	                    howmany = howmany - 1;
	                    if(errr){
	                    	console.log("error in toArray", errr);
	                    	callback( {error:errr} );
	                    }
	                    if(result) console.log("found: " +  result.length);
	                    for(var k = 0; k < result.length; k++){
	                        var existing = pkeys.indexOf(result[k].crn);
	                        if( existing < 0 ){
	                            possible.push(result[k]);
	                            pkeys.push(result[k].crn);
	                        }
	                        else{
	                            // this currently just adds extraneous info
	                            // but when search terms get refined / classes are crosslisted
	                            // this will help stop confusion by telling people
	                            // that the class might be called something else
	                            if(!possible[existing].also)
	                                possible[existing].also = [];
	                            possible[existing].also.push(result[k]);
	                        }
	                    }
	                    if(howmany == 0){
	                        console.log("returning search results");
	                        callback(possible);                   
	                    }
	                });
	            }
	        });
    	}
	}

})(search);

exports = module.exports = search;
