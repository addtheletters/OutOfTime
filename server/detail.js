var detail = {};

(function(lib){
	lib.parse = function(raw_object){
		var parsed = {
			crn:raw_object.crn,
			prerequisites:lib.reqs.parseReqs(raw_object["Prerequisites"]),
			corequisites:lib.reqs.parseReqs(raw_object["Corequisites"])
		};

		//lib.parsePrereqs(raw_object["Corequisites"], parsed);
		//lib.parseCoreqs(raw_object["Prerequisites"], parsed);
		// parsed.ptokens = lib.reqs.tokenize(raw_object["Prerequisites"]); 
		// parsed.ast = lib.reqs.buildAST(parsed.ptokens);
		
		return parsed;
	};

	lib.reqs = {};

	lib.reqs.parseReqs = function( raw_reqs ){
		return lib.reqs.buildAST( lib.reqs.tokenize(raw_reqs) );
	};

	lib.reqs.tokenize = function( raw_reqs ){
		return raw_reqs.split(/(AND)|(OR)|(\()|(\))/g)
			.map((tkn)=>( (tkn) ? tkn.trim() : null)) // trim whitespace from each token
			.filter((tkn)=>(tkn && (tkn.length > 0))); // rid of null and 0-length tokens
	};

	// Shunting-yard algorithm
	lib.reqs.buildAST = function( tokens ){
		var out = [];
		var operators = [];
		var result_stack = [];

		function addNode( stack, operator ){
			var rightNode = stack.pop();
			var leftNode = stack.pop();
			stack.push( new lib.reqs.ASTNode( operator, leftNode, rightNode ) );
		}

		function isOperator( token ){
			return (token === "AND") || (token === "OR");
		}

		var precedence = {
			AND:2,
			OR:1
		}

		yardmain:
		for(var i = 0; i < tokens.length; i++){
			console.log("token is", tokens[i]);
			switch(tokens[i]){
				case '(':
					console.log("found left paren");
					operators.push(tokens[i]);
					break;
				case ')':
					console.log("found right paren");
					var popped;
					while(operators.length > 0){
						popped = operators.pop();
						console.log("popped", popped);
						if(popped === "("){
							break;
						}
						else{
							console.log("adding to result", popped);
							addNode(result_stack, popped);
						}
					}
					console.log("unbalanced parens!");
					break;
				default:
					if(isOperator(tokens[i])){
						var o2;
						while( (operators.length > 0) && (precedence[tokens[i]] <= precedence[o2]) ){
							o2 = operators.pop();
							addNode( result_stack, o2 );
						}
						operators.push(tokens[i]);
					}
					else{
						result_stack.push( new lib.reqs.ASTNode(tokens[i], null, null) );
					}
					break;
			}
		}

		while(operators.length > 0){
			addNode(result_stack, operators.pop());
		}

		return result_stack.pop();
	};

	lib.reqs.ASTNode = function(val, lft, rgt){
		this.value = val;
		this.left  = lft;
		this.right = rgt;
	};

})(detail);

exports = module.exports = detail;
