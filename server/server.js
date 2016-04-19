var express = require('express');
var fs      = require('fs');
var path    = require('path');
var bodyparser = require("body-parser");
var search  = require('./search.js');
var scrape  = require('./scrape.js');
var app     = express();
app.use(bodyparser.json());

var db      = require('mongoskin').db('mongodb://localhost:27017/courses');
var coursecolle = "test1";
var paramscolle = "params";
var detailcolle = "details";
var outfile = "scrape_results.json";
var port    = "8081";

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
    search.courses( req.body.searchtext, function( result ){
        if(result.error){
            res.status(200).send({ok:false, reason:error});
        }
        else{
            res.status(200).send({ok:true, courses:result});
        }
    });
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
// have a checkmark for 'undergrad' that filters out 500+ course numbers
// or similar for untakeable edu or business classes with 4 digit course nums
// or otherwise restricted by attributes? add attributes automagically when parsing?

app.get('/scrape/courses/:subj', function(req, res){
    var term = getTermID(2016, "fall");
    console.log("supposed term id for course search " + term);
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

    console.log("searching for classes with form", form);
    scrape.courses( form, function( result ){
        if(result.error){
            res.send("Something went wrong." + JSON.stringify(result));
        }
        else{
            for(var i = 0; i < result.length; i++){
                saveToDB(result[i], coursecolle, "crn");
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
                writeJSONFile(result, outfile);
            }

            res.send("Let's go. We're getting somewhere, eventually. Search was for ["+req.params.subj+"] <hr><textarea rows='40' cols='100'>"+JSON.stringify(result, null, 4)+"</textarea>");
        }
    });
});

app.get('/scrape/detail/:year/:season/:crn/:day/:time', function(req, res){
    var url = "https://courselist.wm.edu/courselist/courseinfo/addInfo";
    var queryParams = {
        fterm:getTermID(req.params.year, req.params.season),
        fcrn:req.params.crn,
        fday:req.params.day,
        ftime:req.params.time
    };
    //console.log("making request with params", queryParams);
    scrape.details( queryParams, function(result){
        if(!result.error){
            res.send("Science! Scrape for crn ["+req.params.crn+"] <hr><textarea rows='40' cols='100'>"+JSON.stringify(result, null, 4)+"</textarea>");
        }
        else{
            res.send("Something went wrong. " + result.error);
        }
    });
});

// scrape the possible values for attributes and subjects from the
// options on the courselist search page 
app.get('/scrape/params/:type', function(req, res){
    console.log("attempting scrape for param", req.params.type);
    scrape.params( req.params.type, function(result){
        if(result.error){
            res.send("Something went wrong. " + result.error);
        }
        else{
            saveToDB( result, paramscolle, "param_id" );
            if(should_outfile){
                writeJSONFile(result, outfile);
            }
            res.send("We're making progress. Scrape for: ["+req.params.type+"] <hr><textarea rows='40' cols='100'>"+JSON.stringify(result, null, 4)+"</textarea>");
        }
    });
});

app.listen(port)
console.log("scrape active on port " + port);
exports = module.exports = app;
