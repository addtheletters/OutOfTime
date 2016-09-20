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

	lib.POSTFIX_ATTRIBUTES = ["Campus", "Schedule Type", "Credits"];

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
						//console.log("[Header]" + $(this).text().trim());
					}
					else{
						if(index > 0){
							var dindex = Math.floor(index / 2) - 1;
							var dcourse = {};
							var qgeneral = $(this).children().first()
							var qcontents = qgeneral.contents();

							// qcontents.each(function(inde){
							// 	console.log("Content: [" + inde + "]:" + $(this).text());
							// 	}

							// On some of these, a description is listed. On others, it isn't,
							// meaning the 0th element is not correct to assign as the description
							if(qcontents.eq(1).is("br")){
								// this course listing has a description, add it
								dcourse["Description"] = qcontents.eq(0).text().trim();
							}

							// save attributes described in spans
							var lastsaw = null;
							var qcSpans = qcontents.filter("span");
							qcSpans.each(function(dex){
								lastsaw = dex;
								//console.log("Selected: [" + dex + "]:" + $(this).text() + ", next is " +  $(this).get(0).nextSibling.nodeValue);
								dcourse[$(this).text().replace(/:/, "").trim()] = $(this).get(0).nextSibling.nodeValue.trim();
							});
							
							// save attributes described by the strange postfixed names
							if(lastsaw){
								var sib = qcSpans.eq(lastsaw).get(0).nextSibling;
								while(sib.nextSibling){
									sib = sib.nextSibling;
									if(sib.nodeValue == null){
										continue;
									}
									var sibval = sib.nodeValue.trim();
									for(var i = 0; i < lib.POSTFIX_ATTRIBUTES.length; i++){
										//console.log("Searching for " + lib.POSTFIX_ATTRIBUTES[i]);
										if(lib.checkMatchesPostfixAttribute(sibval, lib.POSTFIX_ATTRIBUTES[i])){
											//console.log("Found " + lib.POSTFIX_ATTRIBUTES[i]);
											dcourse[lib.POSTFIX_ATTRIBUTES[i]] = sibval.slice(0, -lib.POSTFIX_ATTRIBUTES[i].length).trim();
										}
									}
								}
							}
							
							// save the catalog link
							dcourse["cataloglink"] = qgeneral.find("a").first().attr("href");

							// TODO pre-parse the table
							dcourse["meetingtimes"] = [];
							
							var attrtable = qgeneral.find("table").first().find("tr");
							var numrows = attrtable.length;
							// console.log("Table text: " + attrtable.text());
							var numattrs = attrtable.eq(0).children().length;

							var attrkeys = [];
							// console.log("Children. ");
							attrtable.eq(0).children().each(function(dex){
								// console.log(dex + ": " + $(this).text());
								attrkeys.push($(this).text().replace(/:/, "").trim());
							});
							for(var meet = 1; meet < numrows; meet++){
								var tmpMeet = {};
								for(var i = 0 ; i < numattrs; i++){
									tmpMeet[attrkeys[i]] = attrtable.eq(meet).children().eq(i).text().trim();
								}
								dcourse.meetingtimes.push(tmpMeet);
							}
							
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

	lib.checkMatchesPostfixAttribute = function( text, keycheck ){
		if(text == null || text.length < 1){
			return false;
		}
		else{
			if(text.slice(-keycheck.length) === keycheck){
				// console.log("Verified " + text + " against " + keycheck);
				return true;
			}
		}
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
