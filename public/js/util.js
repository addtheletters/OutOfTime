var util = {};

(function(lib){
	lib.time = {};
	lib.time.formatHourMinute = function(rawtime, HOUR24){
		if(!rawtime){
			return "[No time]";
		}
		var t = {};
		t.bhrs = parseInt(rawtime.slice(0, -2));
		t.bmin = parseInt(rawtime.slice(-2));
		t.half;
		if(!HOUR24){
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

	lib.time.halfOfDay = function(formattedTime){
		var half = formattedTime.slice(-2);
		if(half === "AM" || half === "PM"){
			return half;
		}
		else{
			return null;
		}
	}

	lib.time.formatTime = function(time, HOUR24){
		if(!time.start && !time.end){
			return "[No time]";
		}
		var f1 = lib.time.formatHourMinute(time.start, HOUR24);
		var f2 = lib.time.formatHourMinute(time.end, HOUR24);
		var h1 = lib.time.halfOfDay(f1);
		var h2 = lib.time.halfOfDay(f2);
		if( (h1 && h2) && (h1 === h2) ){ // starts and ends on same half of day
			f1 = f1.slice(0, -3); // only show which half after the second time
		}
		return f1 + " - " + f2;
	}

	lib.time.formatCompleteTime = function(time, HOUR24){
		return ((time.raw_days && time.raw_days.length > 0) ? (time.raw_days + " | ") : ("")) + lib.time.formatTime(time, HOUR24);
	}

})(util);

exports = module.exports = util;
