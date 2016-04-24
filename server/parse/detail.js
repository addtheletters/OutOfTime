var detail = {};

(function(lib){
	lib.parse = function(raw_object){
		var parsed = {
			crn:raw_object.crn,
			prerequisites:lib.parseReqs(raw_object["Prerequisites"]),
			corequisites:lib.parseReqs(raw_object["Corequisites"])
		};

		lib.parseDates( raw_object["Course Dates"], parsed );
		
		return parsed;
	};

	lib.parseDates = function(dates, obj){
		var tkns = dates.split("-").filter((tkn)=>(tkn.length > 0)).map((tkn)=>(tkn.trim()));
		obj      = obj || {};
		obj.dates       = {};
		obj.dates.raw   = dates;
		obj.dates.start = tkns[0]; // maybe want to parse this more, but only if that becomes important
		obj.dates.end   = tkns[1];	// these are already plenty human-readable
		return obj;
	};

	lib.parseLocation = function(place, obj){
		var tkns = place.split("--").filter((tkn)=>(tkn.length > 0)).map((tkn)=>(tkn.trim()));
		obj      = obj || {};
		obj.location          = {};
		obj.location.building = tkns[0];
		obj.location.room     = tkns[1];
		return obj;
	};

	lib.parseReqs = function( raw_reqs ){
		return lib.reqs.buildAST( lib.reqs.tokenize(raw_reqs) );
	};

	lib.reqs = {};

	lib.reqs.tokenize = function( raw_reqs ){
		return raw_reqs.split(/(AND)|(OR)|(\()|(\))/g)
			.map((tkn)=>( (tkn) ? tkn.trim() : null)) // trim whitespace from each token
			.filter((tkn)=>(tkn && (tkn.length > 0))); // rid of null and 0-length tokens
	};

	// Shunting-yard algorithm
	lib.reqs.buildAST = function( tokens ){

		if(tokens.length < 1){
			return; // no tokens? no tree
		}

		var operators    = [];
		var result_stack = [];

		function addNode( stack, operator ){
			var rightNode = stack.pop();
			var leftNode  = stack.pop();
			stack.push( new lib.reqs.ASTNode( operator, leftNode, rightNode ) );
		}

		function isOperator( token ){
			return (token === "AND") || (token === "OR");
		}

		var precedence = {
			AND:1, // AND should have precedence over OR, but apparently not on OCL pages
			OR:1
		}

		for(var i = 0; i < tokens.length; i++){
			//console.log("token is", tokens[i]);
			switch(tokens[i]){
				case '(':
					//console.log("found left paren");
					operators.push(tokens[i]);
					break;
				case ')':
					//console.log("found right paren");
					var popped;
					while(operators.length > 0){
						popped = operators.pop();
						//console.log("popped", popped);
						if(popped === "("){
							break;
						}
						else{
							//console.log("adding to result", popped);
							addNode(result_stack, popped);
						}
					}
					break;
				default:
					if(isOperator(tokens[i])){
						var o2 = operators[operators.length-1]; // could be undefined if operators is empty
						while( (operators.length > 0 && isOperator(o2)) && (precedence[tokens[i]] <= precedence[o2]) ){
							o2 = operators.pop();
							addNode( result_stack, o2 );
						}
						operators.push(tokens[i]);
					}
					else{
						result_stack.push( new lib.reqs.ASTNode(tokens[i], null, null) );
						//result_stack.push(tokens[i]); // for cleaner testing prints, switch back please for cleaner code
					}
					break;
			}
		}

		while(operators.length > 0){
			addNode(result_stack, operators.pop());
		}

		if(result_stack.length != 1){
			console.log("Uh oh, possible error in building requisite AST. Stack is", JSON.stringify(result_stack, null, 4));
		}

		return result_stack.pop();
	};

	lib.reqs.ASTNode = function(val, lft, rgt){
		this.value = val;
		this.left  = lft;
		this.right = rgt;
	};

	lib.reqs.isUnsatisfied = function( requirement, taken ){
		if(!requirement){
			return false;
		}
		for(var i = 0; i < taken.length; i++){ // assumes no requirement needs multiple classes to satisfy
			if( lib.reqs.countsAs(requirement, taken[i]) ){
				return false;
			}
		}
		return {missing:requirement};
	};

	lib.reqs.countsAs = function( requirement, course ){
		if(requirement === course){
			console.log("requirement is satisfied:", requirement, "with:", course);
		}
		return requirement === course; // placeholder for more complex resolution logic
	};

	// returns false if there are no problems
	// returns object with missing atribute if there is a problem
	// might want to change so always returns an object
	// with 'missing' and 'met' attributes to track both
	lib.reqs.audit = function( node, taken ){
		if(node){
			switch(node.value){
				case "AND":
					var lstate = lib.reqs.audit( node.left, taken );
					var rstate = lib.reqs.audit( node.right, taken );
					if(lstate || rstate){ // if either has not been satisfied (because both are needed)
						var ret = {missing:[].concat(lstate.missing || [], rstate.missing || [])};
						return ret;
					}
					return false;
					break;
				case "OR":
					var lstate = lib.reqs.audit( node.left, taken );
					var rstate = lib.reqs.audit( node.right, taken );
					if(lstate && rstate){
						var ret = {missing:[ {value:"OR", contents:[lstate.missing, rstate.missing]} ]};
						return ret;
					}
					return false;
					break;
				default:
					return lib.reqs.isUnsatisfied( node.value, taken );
					break;
			}
		}
		else{
			return false;
		}
	};

	lib.audit = function( reqs, taken ){
		var node = reqs;
		if(!(reqs instanceof lib.reqs.ASTNode)){
			console.log("detail.audit: attempting to parse reqs into AST");
			if(reqs instanceof Array){ // already tokenized
				node = lib.reqs.buildAST(reqs);
			}
			else{
				node = lib.parseReqs(reqs);
			}
		}
		if(!taken.length){
			console.log("detail.audit: apparently no courses were taken?");
		}
		return lib.reqs.audit( node, taken );
	};

})(detail);

exports = module.exports = detail;
