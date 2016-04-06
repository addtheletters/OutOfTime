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
var coursecolle = "test1";
var paramscolle = "params";
var outfile = "scrape_results.json";
var port    = "8081";

var should_outfile = true;

var static = function(pth){ 
    return function(req, res){
        res.sendFile(pth, {root: path.join(__dirname, "../public")}); // serve from public folder
    }
}

// serve css
app.get("/css/:file", function(req, res){
    res.sendFile("/css/" + req.params.file, {root: path.join(__dirname, "../public")});
});

// serve json
app.get("/json/:file", function(req, res){
    res.sendFile("/json/" + req.params.file, {root: path.join(__dirname, "../public")});
});

// serve javascript
app.get(/\/js\/(.*)/, function(req, res){
    res.sendFile("/js/" + req.params[0], {root: path.join(__dirname, "../public")});
});

// serve viewer
app.get('/view', function(req, res){
    res.sendFile("/viewer.html", {root: path.join(__dirname, "../public")});
});

// respond to search queries from viewer
app.post('/search/all', function(req, res){
    //console.log("req.body", req.body);
    console.log("searching for ", req.body.searchterms);
    var terms    = req.body.searchterms.split(/\s+/).filter((tkn)=>(tkn.length > 0)); // split on whitespace; remove no-length tokens
    var possible = []; // results to return
    var pkeys    = []; // keep track of what has been put in results to avoid duplicates
    var howmany  = terms.length; // count how many of our queries are still pending
    // when this count reaches 0 we know all queries are done so we can send the response
    
    // This loop queries for each term given individually rather than let mongodb do its thing
    // and search for them all at once. This doesn't create any improvements ATM
    // but could be tweaked to allow for more general search terms to be
    // pre-processed (8:00 converted to the database-friendly 0800 for example).

    for(var i = 0; i < terms.length; i++){
        //console.log("term is", terms[i]);
        db.collection(coursecolle).find({$text:{$search:terms[i]}}, function(err, result){
            //console.log("howmany is " + howmany);
            if(err){
                console.log("error in search ", err);
            }
            if(result){
                //console.log("found ", result);
                result.toArray(function(err, result){
                    howmany = howmany - 1;
                    if(err) console.log("error in toArray", err);
                    if(result) console.log("found: " +  result.length);
                    for(var k = 0; k < result.length; k++){
                        //console.log(result[k]);
                        var existing = pkeys.indexOf(result[k].crn);
                        if( existing < 0 ){
                            possible.push(result[k]);
                            pkeys.push(result[k].crn);
                        }
                        else{
                            // this currently just adds extraneous info
                            // but when search terms get refined / classes are crosslisted
                            // this will help stop confusion by telling people
                            // that the class might be called something else
                            if(!possible[existing].also)
                                possible[existing].also = [];
                            possible[existing].also.push(result[k]);
                        }
                        //console.log("possible contains ", possible.length)
                    }
                    if(howmany == 0){
                        console.log("sending search results");
                        //console.log(possible);
                        res.status(200).send({ok:true, courses:possible});                        
                    }
                });
            }
        });
    }
});

// to save / update database entries
function saveToDB( doc, colle, identifier ){
    //console.log("trying to save " + JSON.stringify(parsed));
    // hey look it's es6
    db.collection(colle).findOne({[identifier]:doc[identifier]}, function(err, result){
        if(err){console.log("Error finding existing identifier ("+identifier+"). " + err)};
        if(result){
            //console.log("found " + JSON.stringify( result ) );
            doc._id = result._id;
        }
        db.collection(colle).save(doc, function(err, result){
            if(err){
                console.log("Failed to save to db. " + err);
            }
            if(result){
                //console.log("Saved to db.");
            }
        });
    });
}

function writeJSONFile( str, filename ){
    fs.writeFile(filename, JSON.stringify(str, null, 4), function(err){
        if(err){
            console.log("failed to write data to file. " + err);
        }
        else{
            console.log("successfully wrote to file " + filename);
        }
    });
}

app.get('/scrape/help', function(req, res){
    res.sendFile("/scrape_help.html", {root: path.join(__dirname, "../public")});
});

// web scraper for course information
app.get('/scrape/courses/:subj', function(req, res){

    // have a checkmark for 'undergrad' that filters out 500+ course numbers
    // or similar for untakeable edu or business classes with 4 digit course nums
    // or otherwise restricted by attributes? add attributes automagically when parsing?

    var url = "https://courselist.wm.edu/courselist/courseinfo/searchresults"; // I like doublequotes okay

    var terms = {
        spring16:201620,
        summer16:201630,
        autumn16:201710,
        spring17:201720,
    }
    // eventually these things (and other options) will be dynamically loaded from files in /public/json

    var seasonIDs = {
        fall:"10",
        autumn:"10",
        spring:"20",
        summer:"30",
    }

    function getTermID(year, season){ // fall of 2016 is represented by a term id starting with 2017
        return ((season === "fall" || season === "autumn") ? (year+1).toString() : year.toString()) + seasonIDs[season].toString();
    }

    var term = getTermID(2016, "fall");
    console.log("supposed term id is " + term);
    var subject = req.params.subj || "CSCI";

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
            });

            var parsed = [];

            for(var i = 0; i < data.length; i++){
                console.log("Confirmed course: " + data[i]["COURSE ID"]);
                parsed.push(course.parse(data[i]));
                saveToDB(parsed[i], coursecolle, "crn");
            }

            console.log("Attempting to build search index.");

            // building a search index on all text fields so searches are easy
            db.collection(coursecolle).createIndex({
                    "$**":"text"
                }, {name:"CourseTextIndex"}, function(err){
                    if(err){
                        console.log("Failed to create index, ", err);
                    }
                    else{
                        console.log("Index completed.");
                    }
                }
            );

            if(should_outfile){
                writeJSONFile(parsed, outfile);
            }

            res.send("Let's go. We're getting somewhere, eventually. <hr><textarea rows='40' cols='100'>"+JSON.stringify(parsed, null, 4)+"</textarea>");
        }
        else{
            res.send("Something went wrong. "  + error);
        }
    });
    console.log("Made a request to " + url );
});

// scrape the possible values for attributes and subjects from the
// options on the courselist search page 
app.get('/scrape/params/:type', function(req, res){

    var url = "https://courselist.wm.edu/courselist/";
    var ids = {
        term:"term_code",
        subject:"term_subj",
        attribute:"attr",
        status:"status",
        level:"levl", // not displayed in OCL results (would need to tag ourselves by retreiving results for each level)
        part_of_term:"ptrm", // not displayed in OCL results
    }; // could load this from /public/json/params.json

    request.get({uri:url}, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);
            //console.log("found html", html);

            if(!ids[req.params.type]){
                res.send("Parameter type did not exist: " + req.params.type);
                return;
            }

            var select = $("#"+ids[req.params.type]);

            var options = {
                param_id:ids[req.params.type],
                raw_param:req.params.type,
                value_list:[],
                key_list:[],
            };

            select.children().each(function(index){
                options[$(this).val()] = $(this).text(); // see potential bug below
                options.value_list.push($(this).text());
                options.key_list.push($(this).val());
            });

            // potential bug above: keys cannot contain certain characters.
            // If it turns out a key has a banned character, assigning it into an object will cause an error
            // This may be solved by just using key_list like value_list and then just comparing indexes
            // instead of doing the typical object lookup

            saveToDB( options, paramscolle, "param_id" );

            if(should_outfile){
                writeJSONFile(options, outfile);
            }

            res.send("We're making progress. Scrape for: ["+ids[req.params.type]+"] <hr><textarea rows='40' cols='100'>"+JSON.stringify(options, null, 4)+"</textarea>");
        }
        else{
            console.log("Something went wrong. " + error);
            res.send("Something went wrong. " + error);
        }
    });
    console.log("Made a request to " + url );
});

app.listen(port)
console.log("scrape active on port " + port);
exports = module.exports = app;
