var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var course = require('./course.js');
var app     = express();

var outfile = "scraped_course_stats.json"

app.get('/scrape', function(req, res){

    url = 'https://courselist.wm.edu/courselist/courseinfo/searchresults';

    var term = 201620;

    var form = {
        term_code:term,
        term_subj:"AFST",
        attr:0,
        attr2:0,
        levl:0,
        status:0,
        ptrm:0,
        search:"Search"
    };

    //var coursekeys = ["crn", "courseID", "title", "instructor", "crdtHrs", "meetDays", "meetTimes", "projEnr", "currEnr", "seatsAvail", "status"];

    request.post({url:url, form:form}, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);
            var table = $("#results table"); // gets all the rows!
            
            //console.log(table.html());

            var columns = table.find("thead th").map(function(){
                return $(this).text().trim();
            }).get();

            console.log(columns);

            var data = [];
            table.find("tbody").children().each(function(index){
                if(index % columns.length == 0){
                    data.push( {} );
                }
                var coursekey = columns[index % columns.length];
                data[Math.floor(index / columns.length)][coursekey] = $(this).text().trim();
                //return $(this).html();
            });

            //console.log(data);

            var parsed = [];

            for(var i = 0; i < data.length; i++){
                console.log("Confirmed course: " + data[i]["COURSE ID"]);
                parsed.push(course.parse(data[i]));
                //console.log(parsed[i]);
            }

            fs.writeFile(outfile, JSON.stringify(parsed, null, 4), function(err){
                if(err){
                    console.log("failed to write data to file. " + err);
                }
                else{
                    console.log("successfully wrote to file " + outfile);
                }
            });
            res.send("Let's go. We're getting somewhere, eventually. <hr>"+JSON.stringify(parsed, null, 4));
        }
        else{
            res.send("Something went wrong. "  + error);
        }
    });
    console.log("Made a request to somewhere.");
})

app.listen('8081')
console.log('scrape active on port 8081');
exports = module.exports = app;
