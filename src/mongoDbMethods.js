import * as helpers from 'helpers_jsonld'
import { MongoClient } from 'mongodb'


let uri = 'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT'




export async function getCollections(client, databaseID){

    let action = new helpers.Action("MongoDB Get Collections")

     try {

        const database = client.db(databaseID);

        let collections = await database.listCollections().toArray();

        let tenants = []
        for(let c of collections){

            let t = {
                "@type": "Tenant",
                "name": c.name,
                "url": "/" + c.name
            }
            tenants.push(t)
        }


        action.setCompleted(tenants)

        return action


     } catch(err){

        action.setFailed('getCollection error: ' + String(err))

        return action
     }
    
}



export async function dbGetNested(client, databaseID, tenantID, records) {

    let action = new helpers.Action("MongoDB Get nested", records)
    // console.log(action.toString())

    let initialIDs = []
    let fetchedIDs = []         // ids already fetched
    let toFetchIDs = []         // records to return 
    let recordsDB = new helpers.DB()  // records already fetched 


    try {

        records = Array.isArray(records) ? records : [records]
        initialIDs = records.map(x => x?.["@id"])
        toFetchIDs = toFetchIDs.concat(initialIDs)



        while (toFetchIDs.length > 0) {

            console.log('toFetch',toFetchIDs )
            let a = await dbGet(client, databaseID, tenantID, toFetchIDs, false)
            let dbRecords = a.result
            dbRecords = Array.isArray(dbRecords) ? dbRecords : [dbRecords]
            dbRecords = dbRecords.map(x => x?.record || x)


            // Add records to recordsDB
            recordsDB.post(dbRecords)

            console.log('rrr', records.length)
            // add ids to fetch to already fetched
            fetchedIDs = fetchedIDs.concat(toFetchIDs)

            // Reset toFetchIDs
            toFetchIDs = []

            // Get new ids to fetch
            toFetchIDs = recordsDB.record_ids.filter(x => !fetchedIDs.includes(x))

        }

        let results = initialIDs.map(x => recordsDB.get(x))


        action.setCompleted(results)
        // console.log(action.toString())
        return action?.record || action


    } catch (err) {
        action.setFailed(String(err))
        console.log(action.toString(), err)
        return action?.record || action
    }
}


// ---------------------------------------------
// DB functions
// ---------------------------------------------

export async function dbInit(uri) {

    let action = new helpers.Action('MongoDB Init')

    let client
    try {
        client = new MongoClient(uri);
        let k = await client.connect();

        action.setCompleted(client)
        // console.log(action.toString())
        return action

    } catch (err) {
        action.setFailed(String(err))
        // console.log(action.toString())
        return action
    }

}



export async function dbInsert(client, databaseID, tenantID, records) {


    // init action
    const r = structuredClone(records);

    let action = new helpers.Action('MongoDB Insert', r)
    // console.log(action.toString())

    tenantID = tenantID || 'test'

    let db = new helpers.DB()


    records = Array.isArray(records)? records : [records]
    records = records.map(x => x?.record || x)

    db.post(records)

    records = db.getRecords(false)


    records = records.map(x => x?.record || x)

    // Retrieve
    let queries = []
    for (let r of records) {

        let q = {
            updateOne: {
                filter: { "data.@id": r?.['@id'] },
                update: {
                    $set: {
                        "data": r,
                        "@annotation.dbModifiedDate": new Date()
                    },
                    $setOnInsert: {
                        "@annotation.dbCreatedDate": new Date()
                    }
                },
                upsert: true
            }
        }
        queries.push(q)
    }




    try {
        let database = client.db(databaseID);
        let collection = database.collection(tenantID);
        let r = await collection.bulkWrite(queries)

        action.setCompleted(r)
        // console.log(action.toString())
        return action

    } catch (err) {
        action.setFailed(String(err))
        return action
    }

    return r

}


export async function dbSearch(client, databaseID, tenantID, filter, orderBy, orderDirection, limit, offset, expand = true) {


    // init action
    let action = new helpers.Action('MongoDB Search', filter)
    // console.log(action.toString())

    tenantID = tenantID || 'test'
    filter = filter || {}
    orderBy = orderBy || "@id"
    orderDirection = orderDirection || 1
    offset = offset || 0
    limit = limit || 100


     try{
        offset = Number(offset)
    } catch {
        offset = 0
    }


    try{
        limit = Number(limit)
    } catch {
        limit =100
    }


    for (let k of Object.keys(filter)) {
        filter['data.' + k] = filter[k]
        delete filter[k]
    }

    try {

        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let ordering = {}
        ordering[orderBy] = orderDirection
        let records = await collection.find(filter).sort(ordering).skip(offset).limit(limit).toArray();

        // Clean records
        records = _cleanMongoRecord(records)

        // Expand
        if (expand == true) {
            records = await dbGetNested(client, databaseID, tenantID, records)
            records = records?.result || []
        }


        action.setCompleted(records)
        // console.log(action.toString())
        return action


    } catch (err) {
        // console.log('err', err)
        action.setFailed(String(err))
        // console.log(action.toString())
        return action
    }


}



export async function dbGet(client, databaseID, tenantID, record_ids, expand = true) {

    // init action
    let action = new helpers.Action('MongoDB Get', record_ids)
    // console.log(action.toString())


    tenantID = tenantID || 'test'

    record_ids = Array.isArray(record_ids)  ? record_ids : [record_ids]

    record_ids = record_ids.map(x => x?.["@id"] || x)

    let query = record_ids.map(x => { return { "data.@id": x } })
    query = { '$or': query }


    try {

        const database = client.db(databaseID);
        const collection = database.collection(tenantID);


        let records = await collection.find(query).toArray();

        
        // Clean records
        records = _cleanMongoRecord(records)

        // Expand
        if (expand == true) {
            records = await dbGetNested(client, databaseID, tenantID, records)
            records = records.map(x => x?.result )
        }
        console.log('r', JSON.stringify(records, null, 4))

        action.setCompleted(records)
        return action?.record 




    } catch (err) {
        // console.log('err', err)
        action.setFailed(String(err))
        // console.log(action.toString())
        return action
    }

}


export async function dbDelete(client, databaseID, tenantID, filter) {


    // init action
    let action = new helpers.Action('MongoDB Delete', filter)
    // console.log(action.toString())

    filter = filter || {}
    for (let k of Object.keys(filter)) {
        filter['data.' + k] = filter[k]
        delete filter[k]
    }

    try {

        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let records = await collection.deleteMany(filter);

        action.setCompleted()
        // console.log(action.toString())
        return action


    } catch (err) {
        action.setFailed(String(err))
        // console.log(action.toString())
        return action
    }




}

// ------------------------------------------------
// Cleanup
// ------------------------------------------------

function _cleanMongoRecord(record) {

    if (Array.isArray(record) && typeof record != "string") {
        return record.map(x => _cleanMongoRecord(x))
    }

    record = record?.['data']
    return record
}

