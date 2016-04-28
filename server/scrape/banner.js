var banner = {};

var request   = require('request');
var cheerio   = require('cheerio');

(function(lib){
	lib.URLS = {
		COURSESTART:"https://banweb.wm.edu/pls/PROD/bwckschd.p_disp_dyn_sched",
		COURSETERM:"https://banweb.wm.edu/pls/PROD/bwckschd.p_get_crse_unsec",
		DATE_REFER:"https://banweb.wm.edu/pls/PROD/bwckschd.p_disp_dyn_sched",
		OPTION_REFER:"https://banweb.wm.edu/pls/PROD/bwckgens.p_proc_term_date",
		COOKIE:"https://banweb.wm.edu/pls/PROD/",
		DETAIL:"https://banweb.wm.edu/pls/PROD/bwckschd.p_disp_detail_sched",
		BASE:"https://banweb.wm.edu/pls/PROD/",
	}

	lib.semesters = function( semester, form, callback ){
		request.get({uri:lib.URLS.COURSESTART}, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				var select = $("#term_input_id");

				var allsemesters = [];
				select.children().each(function(index){
					var ckey = $(this).val();
					var cval = $(this).text();
					allsemesters.push( {key:ckey, value:cval} );
				});

				console.log("Our semester is", semester); // not sure where I was going with this
				return callback(response);//lib.course.term( semester, form, callback );
			}
			else{
				return callback({error:true, reason:error});
			}
		});
	};

	lib.courses = function( form, callback ){
		// var f1 = {
		// 	p_calling_proc:"bwckschd.p_disp_dyn_sched",
		// 	p_term:form.term_in,
		// };
		//console.log("following redirects");
		// var j = request.jar();
		// var cook = request.cookie('TESTID=set;accessibility=false;');
		// j.setCookie(cook, lib.URLS.COOKIE);
		// console.log("cookie jar is", j);

		// console.log("Using referer " + h.Referer + " with url " + lib.URLS.COURSETERM);
		console.log("form", form);
		request.post({url:"https://banweb.wm.edu/pls/PROD/bwckschd.p_get_crse_unsec", form:form, headers:{Referer:"https://banweb.wm.edu/pls/PROD/bwckgens.p_proc_term_date"}}, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				// for some reason this gets the page where one can select search options
				// instead of the correct search results page
				//console.log(html);
				return callback(response);
			}
			else{
				console.log(error);
				return callback({error:true, reason:error.toString()});
			}
		});
	};

	lib.stcourses = function(form, callback){
		var referer = "bwckgens.p_proc_term_date";
  		var url = "bwckschd.p_get_crse_unsec";
		var options = {
			method:"POST",
			url: lib.URLS.BASE + url + "?" + lib.getSillyFormString(form),
			headers:{
				"Referer": lib.URLS.BASE + referer,
			}
		};
		request(options, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				return callback(response);
			}
			else{
				console.log(error);
				return callback({error:true, reason:error.toString()});
			}
		});
	}

	lib.subject = function( term, subj, callback ){
		var form = lib.getCourseForm({term_in:term, sel_subj:subj});
		console.log("string version",lib.getFormString(form));
		console.log("silly string", lib.getSillyFormString(form));
		lib.stcourses( form, callback );
	};

	// holy s*** this function works
	lib.detail = function( term, crn, callback ){
		var qs = {
			term_in:term,
			crn_in:crn
		};
		request.get({uri:lib.URLS.DETAIL, qs:qs, headers:{Referer:"https://banweb.wm.edu/pls/PROD/bwckschd.p_get_crse_unsec"}}, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				return callback(response);
			}
			else{
				console.log("error", error);
				return callback({error:true, reason:error.toString()});
			}
		});
	}

	lib.FORM_DEFAULTS = {
		// default "dummy"
		term_in:"dummy",
		sel_subj:"dummy", // what
		sel_day:"dummy",
		sel_schd:"dummy",
		sel_insm:"dummy", // "%"
		sel_camp:"dummy",
		sel_levl:"dummy",
		sel_sess:"dummy",
		sel_instr:"dummy",
		sel_ptrm:"dummy",
		sel_attr:"dummy",
		// default empty
		//sel_subj:"", // "dummy"
		sel_crse:"",
		sel_title:"",
		sel_from_cred:"",	// "dummy"
		sel_to_cred:"",		// "dummy"
		// default %
		sel_schd:"%", // "dummy"
		sel_camp:"%",
		sel_levl:"%",
		sel_instr:"%",
		sel_attr:"%",
		// default 0
		begin_hh:0,
		begin_mi:0,
		begin_ap:0, // "a"
		end_hh:0,
		end_mi:0,
		end_ap:0,	// "a"
	};

	lib.getCourseForm = function( params ){
		params = params || {};
		for( var key in lib.FORM_DEFAULTS ){
			if(lib.FORM_DEFAULTS.hasOwnProperty(key)){
				params[key] = params[key] || lib.FORM_DEFAULTS[key];
			}
		}
		return params;
	};

	lib.getFormString = function( form ){
		var datastr = "";
		var after = false;
		for( var key in form ){
			if(form.hasOwnProperty(key)){
				if(after){
					datastr += "&";
				}
				else{
					after = true;
				}
				datastr += key.toString() + "=" + form[key].toString();
			}
		}
		return datastr;
	}

	lib.getSillyFormString = function(form){
		var datastr = "term_in="+form.term_in+"&"+
                  //"sel_subj="+form.sel_subj+"&"+
                  "sel_subj=dummy&"+
                  "sel_day="+form.sel_day+"&"+
                  "sel_schd="+form.sel_schd+"&"+
                  "sel_insm="+form.sel_insm+"&"+
                  "sel_camp="+form.sel_camp+"&"+
                  "sel_levl="+form.sel_levl+"&"+
                  "sel_sess="+form.sel_sess+"&"+
                  "sel_instr="+form.sel_instr+"&"+
                  "sel_ptrm="+form.sel_ptrm+"&"+
                  "sel_attr="+form.sel_attr+"&"+
                  "sel_subj="+form.sel_subj+"&"+
                  "sel_crse="+form.sel_crse+"&"+
                  "sel_title="+form.sel_title+"&"+
                  "sel_insm=%&"+
                  "sel_from_cred=&"+
                  "sel_to_cred=&"+
                  "sel_levl=%&"+
                  "sel_instr=%&"+
                  "sel_attr=%&"+
                  "begin_hh="+form.begin_hh+"&"+
                  "begin_mi="+form.begin_mi+"&"+
                  "begin_ap="+form.begin_ap+"&"+
                  "end_hh="+form.end_hh+"&"+
                  "end_mi="+form.end_mi+"&"+
                  "end_ap="+form.end_ap+"";
      	return datastr;
	}

})(banner);

exports = module.exports = banner;
