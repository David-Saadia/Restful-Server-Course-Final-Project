
const Cost = require("../models/costs");
const Report = require("../models/report");
const {addToUserTotal, testUIDExists} = require("./users_controller");

/*
    response.status(_status).json({obj});
    Automatically sets header "Content-Type":"application.json", "stringify"s the object, and ends the response.
 */


/**
 * This function adds a new item to the costs collection on the database.
 * <ul>
 *     <li>If the userid doesn't match any users in the users collection, we abort.</li>
 *     <li>If there's a cached report for the month when the cost item is added,
 *     we remove the report from the DB.</li></ul>
 *
 * @param request - request received from client
 * @param {String} request.body.category - expense item description
 * @param {Number} request.body.userid - userid that initiated the purchase
 * @param {Number} request.body.sum - expense item sum
 * @param {Date} [request.body.date] - expense item addition date
 * @param response - response to send back to client
 * @returns {Promise<void>}
 */
exports.addCost = async (request, response) => {
        const {userid, sum} = request.body;
        //BEFORE adding to user total - make sure you validate the request and check if the user exists.
        const testUIDResult = await testUIDExists(userid);
        if (testUIDResult !== 0){
            return (testUIDResult===-1)
                    ? response.status(400).json({"errorMessage":"Invalid User ID. User ID must contain only digits."})
                    : response.status(404).json({"errorMessage":"Invalid User ID. User does not exist."}); }
    try{
        const addedCost = await Cost.create(request.body);
        //Attempt to add cost to user's total sum to implement the Computed Design Pattern.
        await addToUserTotal(userid, sum);

        //Stripping unwanted attributes (like _id and __v)
        const {_id, __v, ...rest} = addedCost.toObject();
        const {date} = addedCost;
        response.status(201).json(rest);

        //Handling removing cached report (if it exists)
        await removeCachedReport(userid,date);
    }
    catch (err){
        console.log(err);
        response.status(500).json({"errorMessage": err.message});
    }
}

/**
 * This function will attempt to retrieve a report from the cached report collection,
 * if it finds a valid instance, it will instantly return the object preventing further
 * calculations, implementing the Computed design pattern.
 *
 * If it doesn't, the function will retrieve all cost items matching the userID
 * filtering the results with a date range and package it with the given categories.
 *
 * The function then caches the report and returns it as a response to the client.
 *
 * @param request - The request received by the client
 * @param {String} request.query.id - The userID to get the report for
 * @param {String} request.query.year - The year to filter costs from
 * @param {String} request.query.month - the month to filter costs from
 * @param response - The response to send back to the client
 * @returns {Promise<*>}
 */
exports.getReport = async (request, response) => {
    //Pull the values from the query string
    const { id:idQuery, year:yearQuery, month:monthQuery} = request.query;

    const categories = ["food", "health", "housing", "sport","education"];
    const groupedCosts = {};
    const validationResult = await validateQueryData(idQuery, yearQuery, monthQuery);
    //Initialize an empty array for each category.
    categories.forEach(category => groupedCosts[category] = []);

    if (!validationResult.success){
        return response.status(400).json({"errorMessage": validationResult.errorMessage});}
    const {idNumber, year, month} = validationResult;


    try{ // Wrap with try...catch when messing with DB operations.
        // Searching for cached report to implement the Computed Design Pattern.
        const cachedReport = await Report.findOne({userid:idNumber,year:year,month:month});
        if(cachedReport){
            console.log("Returning cached report...");
            //Stripping unwanted attributes to match format requirements..
            const {userid,year:cachedYear, month:cachedMonth, costs:cachedCosts} = cachedReport
            return response.status(200).json({userid,year:cachedYear, month:cachedMonth, costs:cachedCosts});
        }
        const filteredCosts = await getCostsByUser(idNumber,year,month);
        if(filteredCosts){
            //Populate arrays according to given categories.
            for (const costItem of filteredCosts){
                const day = costItem.date.getDate();
                if( groupedCosts.hasOwnProperty(costItem.category)){
                    groupedCosts[costItem.category].push(
                        {sum: costItem.sum, description: costItem.description, day});
                }
                else{ console.log("No matching category for cost item.\nSkipping..."); }
            }
        }
        // Current format: {food:[],sports:[],health:[],...} ---> requested format: {{food:[]},{sport:[]},{health:[]},...}
        //Wrapping each category with an object to match format requirements
        const categorizedCostsArray = categories.map(category => ({[category]: groupedCosts[category]}));

        const newReport = {"userid": idNumber, year, month, "costs": categorizedCostsArray};
        //Cache report
        Report.create(newReport)
            .then(() => console.log("Report cached successfully"))
            .catch((err) => console.log("Some error occurred while caching report to DB: " + err));

        response.status(200).json(newReport);
    }
    catch(error){
        console.log(error);
        response.status(500).json({"errorMessage": "Internal server error: " + error.message});
    }

}


/**
 * This function will retrieve cost items by userId and optionally
 * filter them by Date.
 * @param {Number} userid - userId to search results by
 * @param {Number} [year] - The year to filter costs from
 * @param {Number} [month] - the month to filter costs from
 * @returns {Array<mongoose.model>|null} - an array of Cost items
 * **/
const getCostsByUser = async (userid, year, month) =>{
    const dbSearchFilter = {userid};
    if(year && month){
        //Create date range to filter cost items from. Months start from 0, therefore if we want the 5th month, we need
        //the 4th monthIndex.
        const startDateRange = new Date(year, month-1, 1);
        const endDateRange = new Date(year, month, 1);
        // Greater than startDateRange, less than endDateRange.
        dbSearchFilter.date = {$gte: startDateRange, $lte: endDateRange}
    }
    const filteredCosts = await Cost.find(dbSearchFilter);
    if(filteredCosts.length > 0){
        return filteredCosts;
    }
    console.log(`No matching costs for user ${userid}.`)
    return null;
}

/**
 * Simple function to validate received data from the get request query string.
 * @param {String} idQuery - userId to validate
 * @param {String} yearQuery - yearQuery to validate
 * @param {String} monthQuery - monthQuery to validate
 * @returns {{success: boolean, errorMessage: string}|{success: boolean, year: number, month: number}}
 */
const validateQueryData = async (idQuery, yearQuery, monthQuery)  =>{
    //Error strings prep
    const errorStrings = [
        "Missing required parameter. id, year, and month are required query parameters.",
        "Received one or more invalid values. Please supply correct values",
        "Bad UserID format. Please supply UserID that has no letters and is greater than 0.",
        "User does not exist."];
    const testResult = await testUIDExists(idQuery);
    if(testResult!==0){
            return {success:false, "errorMessage":(testResult===-1)?errorStrings[2]:errorStrings[3] }; }
    const regexTest = /^[1-9][0-9]*$/; //Format: Greater than 0, no letters.
    //Check for missing or bad values in request query string
    if(!idQuery || !yearQuery || !monthQuery || !regexTest.test(yearQuery) || !regexTest.test(monthQuery) ){
        return {success: false, "errorMessage": errorStrings[0]}; }

    const idNumber = parseInt(idQuery);
    const year = parseInt(yearQuery);
    const month = parseInt(monthQuery);
    //Check for invalid values received by the client:
    if( month > 12 || year>2025){
        return {success: false, "errorMessage": errorStrings[1]}; }

    //Returning valid values.
    return {success: true, idNumber, year, month};
}

/**
 * This function finds and removes a monthly report (if it exists).
 * @param {Number} userid - userId to match the report for
 * @param {Date} date - Date object to match the report for
 * @returns {Promise<void>}
 * @throws Error - Thrown by the mongoose module if any failure in writing to database occurs.
 */
const removeCachedReport = async (userid, date) =>{
    const costDate = new Date(date || Date.now());
    const year = costDate.getFullYear();
    const month = costDate.getMonth() + 1; //dateIndex starts at 0, we save the report with months starting with 1.

    const deletedReport = await Report.deleteOne({userid,year,month});
    if(deletedReport.deletedCount > 0){
        console.log(`Cached report for ${month}/${year} for user ${userid} deleted successfully.`);}
    else{
        console.log(`No cached reports found for user ${userid} in the given month.`);}
}

exports.deleteAll = async (request, response) => {
    await Cost.deleteMany();
    response.status(200).json({"success": true});
}