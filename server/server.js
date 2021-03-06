var express = require('express');
var fs      = require('fs');
var path    = require('path');
var bodyparser = require("body-parser");
var search  = require('./search.js');
var s_open  = require('./scrape/open.js');
var s_banner= require('./scrape/banner.js');
var util    = require('../public/js/util.js');
var app     = express();
app.use(bodyparser.json());

var db      = require('mongoskin').db('mongodb://localhost:27017/courses');
var coursecolle_old = "test1";
var coursecolle_ext = "course";
var paramscolle = "params";
var detailcolle = "details";
var outfile = "scrape_results.json";
var port    = "8081";

var should_outfile = true;

function getTermCollection( termID ){
    return termID + coursecolle_ext;
}

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
app.post('/search/:term', function(req, res){
    search.courses( req.body.searchtext, getTermCollection(req.params.term), function( result ){
        if(result.error){
            res.status(200).send({ok:false, reason:result.error});
        }
        else{
            res.status(200).send({ok:true, courses:result});
        }
    });
});

// to save / update database entries
function saveToDB( doc, colle, identifier ){
    //console.log("trying to save " + JSON.stringify(doc));
    // hey look it's es6
    db.collection(colle).findOne({[identifier]:doc[identifier]}, function(err, result){
        if(err){console.log("Error finding existing identifier ("+identifier+"). " + err)};
        if(result){
            //console.log("found " + JSON.stringify( result ) );
            doc._id = result._id;
        }
        db.collection(colle).save(doc, function(err, result){
            if(err){
                //console.log("Failed to save to db. " + err);
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

function sendFailure( res, err, message ){
    res.send((message || ("Something went wrong.")) + " " + JSON.stringify(err, null, 4));
}

function sendViewable( res, toview, message ){
    res.send((message || ("Something worked.")) + " <hr><textarea rows='40' cols='100'>"+JSON.stringify(toview, null, 4)+"</textarea>");
}

function sendRenderable( res, toview, message ){
    res.send((message || ("Something worked.")) + " <hr>"+( toview.body ? toview.body : JSON.stringify(toview, null, 4) ));
}

function genericHandler( res ){
    return (function( result ){
        if(result.error){
            sendFailure(res, result, "Something went wrong." );
        }
        else{
            sendRenderable(res, result, "nice");
        }
    });
}

app.get('/scrape/help', function(req, res){
    res.sendFile("/scrape_help.html", {root: path.join(__dirname, "../public")});
});

// TODO figure out how banner works
app.get('/scrape/banner/:year/:season/:subject', function(req, res){
    var term = util.term.getTermID(parseInt(req.params.year), req.params.season);
    s_banner.subject( term, req.params.subject, genericHandler(res));
});

app.get('/scrape/banner/test', function(req, res){
    //s_banner.semesters(genericHandler(res));
    var term = util.term.getTermID(2016, "fall");
    s_banner.subject( term, "AFST", genericHandler(res));
});

app.get('/scrape/banner/detail/:year/:season/:crn', function(req, res){
    var term = util.term.getTermID(parseInt(req.params.year), req.params.season);
    s_banner.detail(term, req.params.crn, genericHandler(res));
});

// web scraper for course information
// have a checkmark for 'undergrad' that filters out 500+ course numbers
// or similar for untakeable edu or business classes with 4 digit course nums
// or otherwise restricted by attributes? add attributes automagically when parsing?

app.get('/scrape/open/courses/:year/:season/:subj', function(req, res){
    var term = util.term.getTermID(parseInt(req.params.year), req.params.season);
    var colle = getTermCollection(term);
    console.log("supposed term id for course search " + term);
    var subject = req.params.subj || "0"; // defaults to ALL

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

    console.log("scraping for classes with form", form);
    s_open.courses( form, function( result ){
        if(result.error){
            sendFailure(res, result);
        }
        else{

            for(var i = 0; i < result.length; i++){
                saveToDB(result[i], colle, "crn");
            }

            console.log("done saving to DB");
            console.log("Attempting to build search index.");
            // building a search index on all text fields so searches are easy
            db.collection(colle).createIndex({
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

            sendViewable(res, result, "Let's go. We're getting somewhere, eventually. Scrape was for ["+req.params.subj+"] in ["+term+"]");
        }
    });
});

app.get('/scrape/open/detail/:year/:season/:crn/:day/:time', function(req, res){
    var url = "https://courselist.wm.edu/courselist/courseinfo/addInfo";
    var queryParams = {
        fterm:util.term.getTermID(parseInt(req.params.year), req.params.season),
        fcrn:req.params.crn,
        fday:req.params.day,
        ftime:req.params.time
    };
    //console.log("making request with params", queryParams);
    s_open.details( queryParams, function(result){
        if(!result.error){
            sendViewable(res, result, "Science! Scrape for crn ["+req.params.crn+"]");
        }
        else{
            sendFailure(res, result);
        }
    });
});

// scrape the possible values for attributes and subjects from the
// options on the courselist search page 
app.get('/scrape/open/params/:type', function(req, res){
    console.log("attempting scrape for param", req.params.type);
    s_open.params( req.params.type, function(result){
        if(result.error){
            sendFailure(res, result);
        }
        else{
            saveToDB( result, paramscolle, "param_id" );
            if(should_outfile){
                writeJSONFile(result, outfile);
            }
            sendViewable(res, result, "We're making progress. Scrape for: ["+req.params.type+"]");
        }
    });
});

app.listen(port)
console.log("scrape active on port " + port);
exports = module.exports = app;
