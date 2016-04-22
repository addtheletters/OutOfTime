var search = {};

var db = require('mongoskin').db('mongodb://localhost:27017/courses');

(function(lib){

	lib.temp_split_tokens = false;

	lib.courses = function( searchtext, term, callback ){
		console.log("searching for ", searchtext);
		var tokens   = searchtext.split(/\s+/).filter((tkn)=>(tkn.length > 0)); // split on whitespace; remove no-length tokens
		var colle    = term;
		var possible = []; // results to return
	    var pkeys    = []; // keep track of what has been put in results to avoid duplicates
	    var howmany  = tokens.length; // count how many of our queries are still pending
	    // when this count reaches 0 we know all queries are done so we can send the response
	    
	    // This loop queries for each token given individually rather than let mongodb do its thing
	    // and search for them all at once. This doesn't create any improvements ATM
	    // but could be tweaked to allow for more general search tokens to be
	    // pre-processed (8:00 converted to the database-friendly 0800 for example).

	    if(tokens.length <= 0){
	    	callback([]);
	    	return;
	    }

		if(lib.temp_split_tokens){
			// this code is actually completely unnecessary
			// since mongodb search will automatically use a logical OR
			// to fix, a specific char / token should be designated as an 'or' or 'and'
			// and then parsed upon the token split, with 'and' fed into $search as wrapped by quotes
			// and 'or' fed in with just spaces in between
		    for(var i = 0; i < tokens.length; i++){
		        db.collection(colle).find({$text:{$search:tokens[i]}}, function(err, result){
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
		                    if(result){
		                    	console.log("found: " +  result.length);
			                    for(var k = 0; k < result.length; k++){
			                        var existing = pkeys.indexOf(result[k].crn);
			                        if( existing < 0 ){
			                            possible.push(result[k]);
			                            pkeys.push(result[k].crn);
			                        }
			                        else{
			                            // this currently just adds extraneous info
			                            // but when search tokens get refined / classes are crosslisted
			                            // this will help stop confusion by telling people
			                            // that the class might be called something else
			                            if(!possible[existing].also)
			                                possible[existing].also = [];
			                            possible[existing].also.push(result[k]);
			                        }
			                    }
			                    if(howmany == 0){
			                        console.log("returning search results", possible.length);
			                        callback(possible);                   
			                    }
			                }
		                });
		            }
		        });
	    	}
	    }
	    else{
	    	console.log("searching using raw text");
	    	// to make this use the OR without the code in the above block, remove the escaped quotes from $search
	    	db.collection(colle).find({$text:{$search:"\""+searchtext+"\""}}, function(err, result){
	            if(err){
	                console.log("error in search ", err);
	                callback( {error:err} );
	            }
	            if(result){
	            	result.toArray(function(errr, result){
						if(errr){
	                    	console.log("error in toArray", errr);
	                    	callback( {error:errr} );
	                    }
	                    if(result){
	                    	console.log("returning search results", result.length);
	                    	callback(result);
	                    }
	            	})
            	}
            });
	    }
	}

})(search);

exports = module.exports = search;
