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
		request.post({url:"https://banweb.wm.edu/pls/PROD/bwckschd.p_get_crse_unsec", form:form, headers:{Referer:"https://banweb.wm.edu/pls/PROD/bwckschd.p_get_crse_unsec"}}, function(error, response, html){
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

	lib.subject = function( term, subj, callback ){
		var form = {
			term_in:term,
			sel_subj:subj,
			sel_crse:"",
			sel_title:"",
			sel_day:"dummy",
			sel_schd:"dummy",
			sel_insm:"dummy",
			sel_camp:"dummy",
			sel_levl:"dummy",
			sel_sess:"dummy",
			sel_instr:"dummy",
			sel_ptrm:"dummy",
			sel_attr:"dummy",
			sel_schd:"%",
			sel_from_cred:"",
			sel_to_cred:"",
			sel_camp:"%",
			sel_levl:"%",
			sel_ptrm:"%",
			sel_instr:"%",
			sel_attr:"%",
			begin_hh:0,
			begin_mi:0,
			begin_ap:"a",
			end_hh:0,
			end_mi:0,
			end_ap:"a",
		};
		lib.courses( {}, callback );
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
				return callback({error:true, reason:error.toString()})
			}
		});
	}

})(banner);

exports = module.exports = banner;
