var course = {};

(function(lib){

	lib.parse = function(raw_object){
		var parsed = {
			crn:raw_object["CRN"],
		};
		lib.parseID(raw_object["COURSE ID"], parsed);
		lib.parseAttributes(raw_object["CRSE ATTR"], parsed);
		parsed.title = raw_object["TITLE"];
		lib.parseInstructor(raw_object["INSTRUCTOR"], parsed);
		parsed.hours = parseFloat( raw_object["CRDT HRS"] );
		lib.parseTime( {
			raw_days:raw_object["MEET DAYS"],
			raw_timeofday:raw_object["MEET TIMES"]
		}, parsed );
		lib.parseSpace( {
			raw_seats:raw_object["PROJ ENR"],
			raw_enrolled:raw_object["CURR ENR"],
			raw_avail:raw_object["SEATS AVAIL"],
			raw_status:raw_object["STATUS"]
		}, parsed );
		return parsed;
	};

	lib.parseID = function(id, obj){
		var tkns = id.split(/\s+/).filter((tkn)=>(tkn.length > 0));
		obj = obj || {};
		obj.id = id;
		obj.subject = tkns[0];
		obj.snumber = tkns[1];
		obj.section = parseInt( tkns[2] );
		return obj;
	};

	lib.parseAttributes = function(attrs, obj){
		var tkns = attrs.split(/\s+/).filter((tkn)=>(tkn.length > 0));
		obj = obj || {};
		obj.attributes = tkns;
		return obj;
	};

	lib.parseInstructor = function(instr, obj){
		var tkns = instr.split(/,\s*/).filter((tkn)=>(tkn.length > 0));
		obj = obj || {};
		obj.instructor = {
			fullname:instr,
			surname:tkns[0],
			givenname:tkns[1],
			nameparts:tkns
		};
		return obj;
	};

	lib.parseTime = function(rawtimes, obj){
		obj = obj || {};
		if(!rawtimes.raw_days && !rawtimes.raw_timeofday){
			obj.time = {has_time:false};
			return obj;
		}
		var daytkns = rawtimes.raw_days.split("");
		var todtkns = rawtimes.raw_timeofday.split("-");
		obj.time = {
			has_time:true,
			start:todtkns[0],
			end:todtkns[1],
			days:daytkns,
		};
		return obj;
	};

	lib.parseSpace = function(rawspace, obj){
		obj = obj || {};
		var specialAvailable = rawspace.raw_avail.search(/\*/);
		var sliced = rawspace.raw_avail;
		if(specialAvailable >= 0){
			sliced = sliced.replace(/\*/, "");
		}
		obj.space = {
			capacity: parseInt(rawspace.raw_seats),
			enrolled: parseInt(rawspace.raw_enrolled),
			crosslisted: (specialAvailable >= 0),
			available: parseInt(sliced),
			status_ok: rawspace.raw_status == "OPEN" ? true: false,
		};
		return obj;
	};

})(course);

exports = module.exports = course;
