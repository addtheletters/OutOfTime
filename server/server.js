var express = require('express');
var fs      = require('fs');
var path    = require('path');
var request = require('request');
var bodyparser = require("body-parser");
var cheerio = require('cheerio');
var course  = require('./course.js');
var app     = express();
app.use(bodyparser.json());

var db      = require('mongoskin').db('mongodb://localhost:27017/courses');
var colle   = "test1";
var outfile = "scraped_course_stats.json";

var static = function(pth){ 
    return function(req, res){
        res.sendFile(pth, {root: path.join(__dirname, "../public")}); // serve from public folder
    }
}

app.get("/css/:file", function(req, res){
    res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

app.get(/\/js\/(.*)/, function(req, res){
    res.sendFile("/js/" + req.params[0], {root: path.join(__dirname, "../public")});
});

// serve viewer
app.get('/view', function(req, res){
    res.sendFile("/viewer.html", {root: path.join(__dirname, "../public")});
});

// respond to searches from viewer
app.post('/search/all', function(req, res){
    console.log("req.body", req.body);
    console.log("searching for ", req.body.searchterms);
    var terms = req.body.searchterms.split(/\s+/).filter((tkn)=>(tkn.length > 0));
    var possible = [];
    var howmany = terms.length;
    console.log("howmany", howmany);
    for(var i = 0; i < terms.length; i++){
        console.log("term is", terms[i]);
        db.collection(colle).find({$text:{$search:terms[i]}}, function(err, result){
            console.log("howmany is " + howmany);
            if(err){
                console.log("error in search ", err);
            }
            if(result){
                //console.log("found ", result);
                result.toArray(function(err, result){
                    howmany = howmany - 1;
                    if(err) console.log("error in toArray", err);
                    if(result) console.log("arraylen is " +  result.length);
                    for(var k = 0; k < result.length; k++){
                        console.log(result[k]);
                        possible.push(result[k]);
                        console.log("possible contains ", possible.length)
                    }
                    if(howmany == 0){
                        console.log("sending it");
                        console.log(possible);
                        res.status(200).send({ok:true, courses:possible});                        
                    }
                });
                /*
                result.each(function(err, course){
                    if(err){
                        console.log("error in result ", err);
                    }
                    if(course){
                        console.log(course);
                        possible.push(course);
                    }
                });*/
            }
        });
    }
});

// web scraper
app.get('/scrape', function(req, res){

    url = 'https://courselist.wm.edu/courselist/courseinfo/searchresults';

    var term = 201620;
    var subject = "CSCI";

    var form = {
        term_code:term,
        term_subj:subject,
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
                saveToDB(parsed[i]);
                //console.log(parsed[i]);
            }

            console.log("Done parsing and saving to db.");
            console.log("Attempting to build search index.");

            db.collection(colle).createIndex({
                    crn:"text",
                    subject:"text",
                    title:"text",
                    "instructor.fullname":"text",
                }, {name:"CourseTextIndex"}, function(err){
                    if(err){
                        console.log("failed to create index, ", err);
                    }
                }
            );

            console.log("Index completed / failed.");

            fs.writeFile(outfile, JSON.stringify(parsed, null, 4), function(err){
                if(err){
                    console.log("failed to write data to file. " + err);
                }
                else{
                    console.log("successfully wrote to file " + outfile);
                }
            });
            res.send("Let's go. We're getting somewhere, eventually. <hr><textarea rows='40' cols='100'>"+JSON.stringify(parsed, null, 4)+"</textarea>");
        }
        else{
            res.send("Something went wrong. "  + error);
        }
    });
    console.log("Made a request to somewhere.");
});

function saveToDB( parsed ){
    //console.log("trying to save " + JSON.stringify(parsed));
    db.collection(colle).findOne({crn:parsed.crn}, function(err, result){
        if(err){console.log("Error finding existing course CRN. " + err)};
        if(result){
            //console.log("found " + JSON.stringify( result ) );
            parsed._id = result._id;
        }
        db.collection(colle).save(parsed, function(err, result){
            if(err){
                console.log("Failed to save to db. " + err);
            }
            if(result){
                //console.log("Saved to db.");
            }
        });
    });
}

app.listen('8081')
console.log('scrape active on port 8081');
exports = module.exports = app;
