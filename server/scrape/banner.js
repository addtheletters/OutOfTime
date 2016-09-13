var banner = {};

var request   = require('request');
var cheerio   = require('cheerio');
var bancourse = require('../parse/bancourse.js');

(function(lib){
	lib.URLS = {
		BASE:"https://banweb.wm.edu/pls/PROD/",
		SEMESTERS:"bwckschd.p_disp_dyn_sched",
		OPTION:"bwckgens.p_proc_term_date",
		COURSE:"bwckschd.p_get_crse_unsec",
		DETAIL:"bwckschd.p_disp_detail_sched",
		CATALOG:"bwckctlg.p_display_courses",
	};

	//lib.PARSE_SLICE_AMOUNT = 15; // TODO: this isn't always the proper adjustment. Need it to be dynamic.
	//lib.INDICES.CAMPUS = 3;

	lib.semesters = function( callback ){
		request.get({uri:lib.URLS.BASE + lib.URLS.SEMESTERS}, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				var select = $("#term_input_id");

				var allsemesters = [];
				select.children().each(function(index){
					var ckey = $(this).val();
					var cval = $(this).text();
					allsemesters.push( {key:ckey, value:cval} );
				});

				return callback(allsemesters);//lib.course.term( semester, form, callback );
			}
			else{
				return callback({error:true, reason:error.toString()});
			}
		});
	};

	lib.stcourses = function(form, callback){
		var options = {
			method:"POST",
			url: lib.URLS.BASE + lib.URLS.COURSE + "?" + lib.getSillyFormString(form),
			headers:{
				"Referer": lib.URLS.BASE + lib.URLS.OPTION,
			}
		};
		request(options, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				var table = $("table[SUMMARY='This layout table is used to present the sections found']");
				
				var data = [];
				table.children().each(function(index){
					//console.log(index);
					//console.log( $(this).html() );
					if(index % 2 != 0){
						data.push({header:$(this).text().trim()});
						console.log("[Header]" + $(this).text().trim() );
					}
					else{
						if(index > 0){
							var dindex = Math.floor(index / 2) - 1;
							var dcourse = {};
							var qcontents = $(this).children().first().contents();

							qcontents.nextUntil(qcontents.find(":contains('Attributes:')")).each(function(dex){
								console.log("Selected: [" + dex + "]:" + $(this).text());
							});

							//.add(qcontents.find('Attributes')).add(qcontents.find('Attributes').next()).

							// first slice processes description to attributes; then display format changes
							var lastkey = "Description";
							var foundAttr = false;
							qcontents.each(function(inde){
								console.log("Content: [" + inde + "]:" + $(this).text());
								if(inde % 2 == 1){
				                    lastkey = $(this).text().replace(/:/, "").trim();
				                }
				                else{
				                    dcourse[lastkey] = $(this).text().trim();
				                    if(lastkey === "Attributes"){
				                    	foundAttr = true;
				                    }
				                }
							});

							if(!foundAttr){
								console.log("Failed to find Attributes parameter.")
							}
							else{
								console.log("Found Attributes parameter.")
							}

							// second slice processes campus, schedule type, credits, catalog link, meet times
							// var qhalf2 = qcontents.slice(lib.PARSE_SLICE_AMOUNT);
							// qhalf2.each(function(index){
							// 	console.log("Content second slice: [" + index + "]:" + $(this).text());
							// });

							//dcourse["Campus"] = qhalf2.eq(lib.INDICES.CAMPUS).text() // TODO these tests when dynamic recog is done

							data[dindex].main = dcourse;
							console.log("Completed: " + JSON.stringify(dcourse, null, 4));
						}
					}
				});
				var parsed = data; // bancourse.parse(data);
				return callback(parsed.toString() + "<br>" + html); // TODO remove the debuginess
			}
			else{
				console.log(error);
				return callback({error:true, reason:error.toString()});
			}
		});
	}

	lib.subject = function( term, subj, callback ){
		var form = lib.getCourseForm({term_in:term, sel_subj:subj});
		// console.log("string version",lib.getFormString(form));
		// console.log("silly string", lib.getSillyFormString(form));
		lib.stcourses( form, callback );
	};

	lib.detail = function( term, crn, callback ){
		var qs = {
			term_in:term,
			crn_in:crn
		};
		request.get({uri:lib.URLS.BASE + lib.URLS.DETAIL, qs:qs, headers:{Referer:lib.URLS.BASE + lib.URLS.COURSE}}, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				return callback(response);
			}
			else{
				console.log("error", error);
				return callback({error:true, reason:error.toString()});
			}
		});
	};

	lib.catalog = function( term, crn, callback ){
		// TODO this, scrape course's catalog entry.
		// sample request url
		// /pls/PROD/bwckctlg.p_display_courses?term_in=201710&one_subj=PHIL&sel_crse_strt=100&sel_crse_end=100&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=
	};

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
	};

	// apparently you need to do it like this. I am disturbed.
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
