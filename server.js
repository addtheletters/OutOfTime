var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();

app.get('/scrape', function(req, res){

    url = 'https://courselist.wm.edu/courselist/courseinfo/searchresults';
    // The structure of our request call
    // The first parameter is our URL
    // The callback function takes 3 parameters, an error, response status code and the html

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

    var coursekeys = ["crn", "courseID", "title", "instructor", "crdtHrs", "meetDays", "meetTimes", "projEnr", "currEnr", "seatsAvail", "status"];

    request.post({url:url, form:form}, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);
            var table = $("#results table"); // gets all the rows!
            
            console.log(table.html());

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

            console.log(data);

            res.send("Let's go. We're getting somewhere, eventually. <hr>"+data);
        }
        else{
            res.send("Something went wrong.");
        }
    });
    console.log("Made a request to somewhere.");
})

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;
