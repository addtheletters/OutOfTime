var detail = {};

(function(lib){
	lib.parse = function(raw_object){
		var parsed = {
			crn:raw_object.crn,
		};

		//lib.parsePrereqs(raw_object["Corequisites"], parsed);
		//lib.parseCoreqs(raw_object["Prerequisites"], parsed);
		parsed.ptokens = lib.reqs.tokenize(raw_object["Prerequisites"]); 
		return parsed;
	};

	lib.parsePrereqs = function(raw_prereqs, obj){
		obj = obj || {};
		obj.prerequisites = [];
		// TODO this
		return obj;
	};

	lib.parseCoreqs = function(raw_coreqs, obj){
		obj = obj || {};
		obj.corequisites = [];
		// TODO this
		return obj;
	};

	lib.reqs = {};
	lib.reqs.tokenize = function( raw_reqs ){
		return raw_reqs.split(/(AND)|(OR)|(\()|(\))/g)
			.map((tkn)=>( (tkn) ? tkn.trim() : null)) // trim whitespace from each token
			.filter((tkn)=>(tkn && (tkn.length > 0))); // rid of null and 0-length tokens
	};

	// crap I'm going to need some kind of lexer / stack / expression tree
	lib.buildExTree = function( tokens ){
		
	};

})(detail);

exports = module.exports = detail;
