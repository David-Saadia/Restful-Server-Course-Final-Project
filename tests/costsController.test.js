//Testing using local app
const request = require('supertest');
const app = require('../app');

const Cost = require("../models/costs");
const User = require("../models/users");


// Testing using real server
const axios = require('axios');
const Report = require("../models/report");
const BASE_URL = 'http://localhost:3000';
const LIVE = true;


describe('Testing the /add endpoint...', ()=>{
    const dummyUserID = 64209;

    beforeAll(async () => {
        await Cost.deleteMany({userid:dummyUserID});
        await User.deleteOne({id:dummyUserID});
        await User.create({id:dummyUserID,first_name:"Johnny", last_name: "Bravo"});});

    afterAll(async () => {
        await Cost.deleteMany({userid:dummyUserID});
        await User.deleteOne({id:dummyUserID});
    });

    it("Testing correct POST request at endpoint", async () => {
        const addedCostItem = { description:"Chicken Bread", category:"food", userid:dummyUserID, sum:20 };
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject(addedCostItem);

    });

    it("Testing correct POST and supplied date request at endpoint", async () => {
        const addedCostItem = { description:"Hamburger", category:"food", userid:dummyUserID, sum:20, date:new Date(2024,10,5)};
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(201);
        delete addedCostItem.date;
        expect(response.body).toMatchObject(addedCostItem);
    });

    it("Testing correct POST and supplied date as string request at endpoint", async () => {
        const addedCostItem = { description:"Sausage", category:"food", userid:dummyUserID, sum:20, date:"2024-10-10"};
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(201);
        delete addedCostItem.date;
        expect(response.body).toMatchObject(addedCostItem);
    });
    it("Testing bad POST request at endpoint - Cause: Bad date value.", async () => {
        const addedCostItem = { description:"Tomato", category:"food", userid:dummyUserID, sum:20, date:"word"};
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("errorMessage");
    });

    it("Testing bad POST request at endpoint - Cause: User not found.", async () => {
        const addedCostItem = { description:"Tomato", category:"food", userid:101, sum:20 };
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("errorMessage");
    });

    it("Testing bad POST request at endpoint - Cause: Bad UserID supplied.", async () => {
        const addedCostItem = { description:"Tomato", category:"food", userid:dummyUserID + "aba", sum:20 };
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("errorMessage");
    });

    it("Testing bad POST request at endpoint - Cause: Empty description.", async () => {
        const addedCostItem = { description:"", category:"food", userid:dummyUserID , sum:20 };
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("errorMessage");
    });

    it("Testing bad POST request at endpoint - Cause: Unmatching category", async () => {
        const addedCostItem = { description:"Last Of Us - Part I", category:"gaming", userid:dummyUserID , sum:20 };
        const response = await request(app).post(`/api/add`).send(addedCostItem);
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("errorMessage");
    });
});

describe('Testing the /report endpoint...', ()=>{

    const dummyUserID = 64209;

    beforeAll(async () => {
        await Report.deleteMany({userid:dummyUserID});
        await Cost.deleteMany({userid:dummyUserID});
        await User.deleteOne({id:dummyUserID});
        await User.create({id:dummyUserID,first_name:"Johnny", last_name: "Bravo"});});

    afterAll(async () => {
        await Report.deleteMany({userid:dummyUserID});
        await Cost.deleteMany({userid:dummyUserID});
        await User.deleteOne({id:dummyUserID});
    });

    afterEach(async()=>{
        //Reset expectation costs.
        expectation.costs = ["food","health","housing","sport","education"].map(item=>({[item]:[]}) );
        await Cost.deleteMany();
    });
    let year = 2025;
    let month = 6;
    const expectation = {
        userid:dummyUserID,  year, month,
        costs: [
            {"food":[]},
            {"health":[]},
            {"housing":[]},
            {"sport":[]},
            {"education":[]}
        ]
    };

    /**
     * Helper function to push items into the expectation array (Instead of building it everytime)
     * @param costItem - costItem to push into the expectation object
     */
    const pushToPlace = (costItem)=>{
        const {sum,description} = costItem ;
        const place = expectation.costs.find(item => item.hasOwnProperty(costItem.category));
        const today = new Date(Date.now()).getDate();
        place[costItem.category].push({sum,description, day:today});
    }
    /**
     * Helper function to set up the expectation object with new expenses
     * and to send said expenses to the endpoint '/api/add'
     * @returns {Promise<void>}
     */
    const setupExpectation = async () => {
        const costItems = [
            ...[{description:"Sausage",sum:20},{description:"Cookie Milk",sum:12},{description:"Chicken Bread",sum:35}]
                .map((item)=>({...item,category:"food",userid:dummyUserID})),
            ...[{description:"Physics Book",sum:300},{description:"Math Book",sum:150},{description:"Attention is all you need",sum:3500}]
                .map((item)=>({...item,category:"education",userid:dummyUserID}))
        ];
        for (const item of costItems) {
            pushToPlace(item);
            await request(app).post('/api/add').send(item);}
    }

    it("Testing producing empty report", async () => {

        const response = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(expectation);
    });

    it("Testing producing filled report", async () => {
        await setupExpectation();
        const response = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(expectation);
    });

    it("Testing producing filled report after caching", async () => {
        await setupExpectation();
        await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        //Caching...?
        const response = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(expectation);
    });

    it("Testing producing filled report after adding new cost", async () => {
        await setupExpectation();
        await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        //Caching...?
        const newCostItem = { description:"Fried Rice", category:"food", userid:dummyUserID, sum:5000 };
        pushToPlace(newCostItem);
        await request(app).post('/api/add').send(newCostItem);
        const response = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(expectation);
    });

    //Bad fields section...
    it("Testing bad request at endpoint.. - Cause: Invalid UserID", async () => {
        const response = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID+"aba"}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errorMessage');
    });

    it("Testing bad request at endpoint.. - Cause: Invalid year format", async () => {
        const response = await request(app).get(`/api/report/?month=${month}&year=aba199&id=${dummyUserID}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errorMessage');
    });
    it("Testing bad request at endpoint.. - Cause: Invalid year number", async () => {
        year = 2028;
        const response1 = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response1.status).toBe(400);
        expect(response1.body).toHaveProperty('errorMessage');
        year = -12;
        const response2 = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response2.status).toBe(400);
        expect(response2.body).toHaveProperty('errorMessage');
        year = 2025; // Reset...
    });

    it("Testing bad request at endpoint.. - Cause: Invalid month format", async () => {
        const response = await request(app).get(`/api/report/?month=a20ba&year=${year}&id=${dummyUserID}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errorMessage');
    });

    it("Testing bad request at endpoint.. - Cause: Invalid month number", async () => {
        month = -5;
        const response1 = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response1.status).toBe(400);
        expect(response1.body).toHaveProperty('errorMessage');
        month = 16;
        const response2 = await request(app).get(`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
        expect(response2.status).toBe(400);
        expect(response2.body).toHaveProperty('errorMessage');
        month = 6; // Reset...
    });

});

//If server is not LIVE, we don't run these test
LIVE?
    describe('Testing Live Server (run live server)', ()=>{

        describe('Testing the /add endpoint...', ()=>{
            const dummyUserID = 64209;

            beforeAll(async () => {
                await Cost.deleteMany({userid:dummyUserID});
                await User.deleteOne({id:dummyUserID});
                await User.create({id:dummyUserID,first_name:"Johnny", last_name: "Bravo"});});

            afterAll(async () => {
                await Cost.deleteMany({userid:dummyUserID});
                await User.deleteOne({id:dummyUserID});
            });

            it("Testing correct POST request at endpoint", async () => {
                const addedCostItem = { description:"Chicken Bread", category:"food", userid:dummyUserID, sum:20 };
                const response = await axios.post(BASE_URL +`/api/add`,addedCostItem);
                expect(response.status).toBe(201);
                expect(response.data).toMatchObject(addedCostItem);

            });

            it("Testing correct POST and supplied date request at endpoint", async () => {
                const addedCostItem = { description:"Hamburger", category:"food", userid:dummyUserID, sum:20, date:new Date(2024,10,5)};
                const response = await axios.post(BASE_URL +`/api/add`,addedCostItem);
                expect(response.status).toBe(201);
                delete addedCostItem.date;
                expect(response.data).toMatchObject(addedCostItem);
            });

            it("Testing correct POST and supplied date as string request at endpoint", async () => {
                const addedCostItem = { description:"Sausage", category:"food", userid:dummyUserID, sum:20, date:"2024-10-10"};
                const response = await axios.post(BASE_URL +`/api/add`, addedCostItem);
                expect(response.status).toBe(201);
                delete addedCostItem.date;
                expect(response.data).toMatchObject(addedCostItem);
            });

            it("Testing bad POST request at endpoint - Cause: Bad date value.", async () => {
                const addedCostItem = { description:"Tomato", category:"food", userid:dummyUserID, sum:20, date:"word"};
                try{
                    await axios.post(BASE_URL +`/api/add`,addedCostItem);
                }catch (err) {
                    expect(err.response.status).toBe(500);
                    expect(err.response.data).toHaveProperty("errorMessage");
                }
            });

            it("Testing bad POST request at endpoint - Cause: User not found.", async () => {
                const addedCostItem = { description:"Tomato", category:"food", userid:101, sum:20 };
                try{
                    await axios.post(BASE_URL +`/api/add`, addedCostItem);
                }catch (err) {
                    expect(err.response.status).toBe(404);
                    expect(err.response.data).toHaveProperty("errorMessage");
                }
            });

            it("Testing bad POST request at endpoint - Cause: Bad UserID supplied.", async () => {
                const addedCostItem = { description:"Tomato", category:"food", userid:dummyUserID + "aba", sum:20 };
                try{
                    await axios.post(BASE_URL +`/api/add`, addedCostItem);
                }catch (err) {
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty("errorMessage");
                }
            });

            it("Testing bad POST request at endpoint - Cause: Empty description.", async () => {
                const addedCostItem = { description:"", category:"food", userid:dummyUserID , sum:20 };
                try{
                    await axios.post(BASE_URL +`/api/add`, addedCostItem);
                }catch (err) {
                    expect(err.response.status).toBe(500);
                    expect(err.response.data).toHaveProperty("errorMessage");
                }
            });

            it("Testing bad POST request at endpoint - Cause: Unmatching category", async () => {
                const addedCostItem = { description:"Last Of Us - Part I", category:"gaming", userid:dummyUserID , sum:20 };
                try{
                    await axios.post(BASE_URL +`/api/add`, addedCostItem);
                }catch (err) {
                    expect(err.response.status).toBe(500);
                    expect(err.response.data).toHaveProperty("errorMessage");
                }
            });
        });

        describe('Testing the /report endpoint...', ()=>{
            const dummyUserID = 64209;

            beforeAll(async () => {
                await Report.deleteMany({userid:dummyUserID});
                await Cost.deleteMany({userid:dummyUserID});
                await User.deleteOne({id:dummyUserID});
                await User.create({id:dummyUserID,first_name:"Johnny", last_name: "Bravo"});});

            afterAll(async () => {
                await Report.deleteMany({userid:dummyUserID});
                await Cost.deleteMany({userid:dummyUserID});
                await User.deleteOne({id:dummyUserID});
            });

            afterEach(async()=>{
                //Reset expectation costs.
                expectation.costs = ["food","health","housing","sport","education"].map(item=>({[item]:[]}) );
                await Cost.deleteMany();
            });
            let year = 2025;
            let month = 6;
            const expectation = {
                userid:dummyUserID,  year, month,
                costs: [
                    {"food":[]},
                    {"health":[]},
                    {"housing":[]},
                    {"sport":[]},
                    {"education":[]}
                ]
            };

            /**
             * Helper function to push items into the expectation array (Instead of building it everytime)
             * @param costItem - costItem to push into the expectation object
             */
            const pushToPlace = (costItem)=>{
                const {sum,description} = costItem ;
                const place = expectation.costs.find(item => item.hasOwnProperty(costItem.category));
                const today = new Date(Date.now()).getDate();
                place[costItem.category].push({sum,description, day:today});
            }
            /**
             * Helper function to set up the expectation object with new expenses
             * and to send said expenses to the endpoint '/api/add'
             * @returns {Promise<void>}
             */
            const setupExpectation = async () => {
                const costItems = [
                    ...[{description:"Sausage",sum:20},{description:"Cookie Milk",sum:12},{description:"Chicken Bread",sum:35}]
                        .map((item)=>({...item,category:"food",userid:dummyUserID})),
                    ...[{description:"Physics Book",sum:300},{description:"Math Book",sum:150},{description:"Attention is all you need",sum:3500}]
                        .map((item)=>({...item,category:"education",userid:dummyUserID}))
                ];
                for (const item of costItems) {
                    pushToPlace(item);
                    await request(app).post('/api/add').send(item);}
            }

            it("Testing producing empty report", async () => {

                const response = await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                expect(response.status).toBe(200);
                expect(response.data).toMatchObject(expectation);
            });

            it("Testing producing filled report", async () => {
                await setupExpectation();
                const response = await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                expect(response.status).toBe(200);
                expect(response.data).toMatchObject(expectation);
            });

            it("Testing producing filled report after caching", async () => {
                await setupExpectation();
                await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                //Caching...?
                const response = await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                expect(response.status).toBe(200);
                expect(response.data).toMatchObject(expectation);
            });

            it("Testing producing filled report after adding new cost", async () => {
                await setupExpectation();
                await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                //Caching...?
                const newCostItem = { description:"Fried Rice", category:"food", userid:dummyUserID, sum:5000 };
                pushToPlace(newCostItem);
                await axios.post(BASE_URL +'/api/add', newCostItem);
                const response = await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                expect(response.status).toBe(200);
                expect(response.data).toMatchObject(expectation);
            });

            //Bad fields section...
            it("Testing bad request at endpoint.. - Cause: Invalid UserID", async () => {
                try{
                    await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID+"aba"}`);
                }catch (err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
            });

            it("Testing bad request at endpoint.. - Cause: Invalid year format", async () => {
                try{
                    await axios.get(BASE_URL +`/api/report/?month=${month}&year=aba199&id=${dummyUserID}`);
                } catch(err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
            });

            it("Testing bad request at endpoint.. - Cause: Invalid year number", async () => {
                try{
                    year = 2028;
                    await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                }   catch (err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
                try{
                    year = -12;
                    await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                } catch(err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
                year = 2025; // Reset...
            });

            it("Testing bad request at endpoint.. - Cause: Invalid month format", async () => {
                try{
                await axios.get(BASE_URL +`/api/report/?month=a20ba&year=${year}&id=${dummyUserID}`);
                }catch(err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
            });

            it("Testing bad request at endpoint.. - Cause: Invalid month number", async () => {
                try{
                    month = -5;
                    await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                }catch(err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
                try{
                    month = 16;
                    await axios.get(BASE_URL +`/api/report/?month=${month}&year=${year}&id=${dummyUserID}`);
                }catch(err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');

                month = 6; // Reset...
                }
            });

        });
    })
    : null;