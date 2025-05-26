
const Cost = require("../models/costs");
const Report = require("../models/report");
const {addToUserTotal} = require("usersController");

/**
 * This function adds a new item to the costs collection on the database.
 * <ul>
 *     <li>If the userid doesn't match any users in the users collection, we abort.</li>
 *     <li>If there's a cached report for the month when the cost item is added,
 *     we remove the report from the DB.</li></ul>
 *
 * @param request - request received from client
 * @param {String} request.body.category - cost item description
 * @param {String} request.body.userid - userid that initiated the purchase
 * @param {Number} request.body.sum - cost item sum
 * @param response - response to send back to client
 * @returns {Promise<void>}
 */
exports.addCost = async (request, response) => {
    try{
        //Add cost to user's total sum to implement the Computed Design Pattern.
        const {userid, sum} = request.body;
        const additionResult = await addToUserTotal(userid, sum);
        if(!additionResult){
            return response.status(404).json({"errorMessage":"User not found.\nAborting expense addition operation.."});
        }
        const addedCost = await Cost.create(request.body);
        //Automatically sets header "Content-Type" : "application.json", "stringify"s the object, and ends the response.
        response.status(201).json(addedCost);
        const {date} = addedCost;

        //Handling removing cached report (if it exists)
        await removeCachedReport(userid,date);
    }
    catch (err){
        console.log(err);
        response.status(500).json({"errorMessage": "Something went wrong...\nError: " + err.message});
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
    const { id, year:yearQuery, month:monthQuery} = request.query;

    const categories = ["food", "health", "housing", "sport","education"];
    const groupedCosts = {};
    const validationResult = validateData(id, yearQuery, monthQuery);
    //Initialize an empty array for each category.
    categories.forEach(category => groupedCosts[category] = []);

    if (!validationResult.success){
        return response.status(400).json({"errorMessage": validationResult.errorMessage});}
    const {year, month} = validationResult;

    try{ // Wrap with try...catch when messing with DB operations.
        // Searching for cached report to implement the Computed Design Pattern.
        const cachedReport = await Report.findOne({userid:id,year:year,month:month});
        if(cachedReport){
            console.log("Returning cached report...");
            return response.status(200).json(cachedReport);
        }
        const filteredCosts = await getCostsByUser(id,year,month);

        //Populate arrays according to given categories.
        for (const costItem of filteredCosts){
            const day = costItem.date.getDate();
            if( groupedCosts.hasOwnProperty(costItem.category)){
                groupedCosts[costItem.category].push(
                    {sum: costItem.sum, description: costItem.description, day});
            }
            else{ console.log("No matching category for cost item.\nSkipping..."); }
        }// Current format: {food:[],sports:[],health:[],...} ---> requested format: {{food:[]},{sport:[]},{health:[]},...}
        //Wrapping each category with an object to match format requirements
        const categorizedCostsArray = categories.map(category => ({[category]: groupedCosts[category]}));

        const newReport = {"userid": id, year, month, "costs": categorizedCostsArray};
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
 * @param {String} userid - userId to search results by
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
 * @param {String} id - userId to validate
 * @param {String} yearQuery - yearQuery to validate
 * @param {String} monthQuery - monthQuery to validate
 * @returns {{success: boolean, errorMessage: string}|{success: boolean, year: number, month: number}}
 */
const validateData = (id, yearQuery, monthQuery) =>{
    //Check for missing values in request query string
    if(!id || !yearQuery || !monthQuery){
        return {
            success: false,
            "errorMessage": "Missing required parameter.\n id, year, and month are required query parameters."
        };
    }
    const year = parseInt(yearQuery);
    const month = parseInt(monthQuery);
    //Check for invalid values received by the client:
    if(isNaN(month) || isNaN(year) || month < 1 || month > 12){
        return {
            success: false,
            "errorMessage": "Received invalid year or month values.\nPlease supply suitable values (month: 1-12)."
        };
    }
    //Returning valid values.
    return {
        success: true,
        year, month
    };

}

/**
 * This function finds and removes a monthly report (if it exists).
 * @param {String} userid - userId to match the report for
 * @param {Date} date - Date object to match the report for
 * @returns {Promise<void>}
 */
const removeCachedReport = async (userid, date) =>{
    const costDate = new Date(date || Date.now());
    const year = costDate.getFullYear();
    //dateIndex starts at 0, we save the report with months starting with 1.
    const month = costDate.getMonth() + 1;

    const deletedReport = await Report.deleteOne({userid,year,month});
    if(deletedReport.deletedCount > 0){
        console.log(`Cached report for ${month}/${year} for user ${userid} deleted successfully.`);
    }
    else{
        console.log(`No cached reports found for user ${userid} in the given month.`)
    }

}