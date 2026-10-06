import {helpers} from 'helpers_jsonld';
import { MongoClient } from 'mongodb';

import * as mongoHelpers from './mongodbHelperMethods.js';


let uri =
    'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT';

// -----------------------------------------------------------------
// Database
// -----------------------------------------------------------------

export async function dbCreateDatabase(client, databaseID, tenantID) {
    let action = new helpers.things.Action('MongoDB Create database');

    try {
        // Select the database (MongoDB creates it if it doesn't exist)
        const db = client.db(databaseID);

        // Select a collection name
        const collection = db.collection('config');

        //
        let data = {
            '@type': 'Dataset',
            '@id': `https://www.test.com/${databaseID}#dataset`,
            name: databaseID,
            dateCreated: new Date(),
        };

        // Insert at least one document to physically create the database
        const insertResult = await collection.insertOne(data);

        // create index
        if (tenantID) {
            let r = await dbCreateIndex(client, databaseID, tenantID);
        }

        action.setCompleted(data);

        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbSearchDatabases(client) {
    let action = new helpers.things.Action('MongoDB Get Databases');

    try {
        // Select a collection name

        // Access the administrative interface
        const adminDb = client.db().admin();

        // Retrieve the list of databases
        const dbList = await adminDb.listDatabases();

        let databases = [];
        for (let db of dbList.databases) {
            let r = {
                '@type': 'Dataset',
                '@id': `https://www.test.com/${db.name}#dataset`,
                name: db.name,
                tenandID: (await getCollections(client, db.name))?.result || [],
            };
            databases.push(r);
        }

        //
        action.setCompleted(databases);

        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbInit(uri) {
    let action = new helpers.things.Action('MongoDB Init');

    let client;
    try {
        client = new MongoClient(uri);
        let k = await client.connect();

        action.setCompleted(client);

        return action;
    } catch (err) {
        action.setFailed(String(err));
        return action;
    }
}

export async function dbHealthCheck(client, databaseID, tenantID) {
    let action = new helpers.things.Action('MongoDB Healthcheck');
    try {
        // Verify indexes
        let indexes =
            (await dbGetIndex(client, databaseID, tenantID))?.result || [];
        indexes = Array.isArray(indexes) ? indexes : [indexes];

        let mainIndex = indexes.find((x) => x.propertyID.includes('@id'));

        if (!mainIndex) {
            let r = await dbCreateIndex(client, databaseID, tenantID);
            action.hasPart.push(r);
            action.description = 'Index missing, created.';
        } else {
            action.description = 'Index already present.';
        }

        action.setCompleted();
        return action?.record || action;
    } catch (err) {
        console.log('Error', err);
        action.setFailed(String(err));
    }
}

// -----------------------------------------------------------------
// Index
// -----------------------------------------------------------------

export async function dbCreateIndex(client, databaseID, tenantID) {
    let action = new helpers.things.Action('MongoDB Create index');

    try {
        await client.connect();
        const db = client.db(databaseID);
        const collection = db.collection(tenantID);

        // Fetch all indexes on the specified collection
        let index1 = await collection.createIndex({ 'data.@type': 1 });
        let index2 = await collection.createIndex({ 'data.@id': 1 });
        let index3 = await collection.createIndex({ 'data.actionStatus': 1 });
        let index4 = await collection.createIndex({ 'data.url': 1 });

        //
        action.setCompleted(indexes);

        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbGetIndex(client, databaseID, tenantID) {
    let action = new helpers.things.Action('MongoDB Get index');

    try {
        await client.connect();
        const db = client.db(databaseID);
        const collection = db.collection(tenantID);

        // Fetch all indexes on the specified collection
        const indexList = await collection.indexes();

        let indexes = indexList.map((i) => ({
            '@type': 'Index',
            '@id': `https://www.test.com/${databaseID}/${tenantID}/${i.name}#index`,
            name: i.name,
            propertyID: Object.keys(i.key),
            unique: i?.unique || false,
        }));

        //
        action.setCompleted(indexes);

        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

// -----------------------------------------------------------------
// Collections
// -----------------------------------------------------------------

export async function getCollections(client, databaseID) {
    let action = new helpers.things.Action('MongoDB Get Collections');

    try {
        const database = client.db(databaseID);

        let collections = await database.listCollections().toArray();

        let tenants = [];
        for (let c of collections) {
            let t = {
                '@type': 'Tenant',
                name: c.name,
                url: '/' + c.name,
                numberOfitems: await getDocumentCount(
                    client,
                    databaseID,
                    c.name,
                ),
                indexes: await dbGetIndex(client, databaseID, c.name),
            };
            tenants.push(t);
        }

        action.setCompleted(tenants);

        return action?.record || action;
    } catch (err) {
        action.setFailed('getCollection error: ' + String(err));

        return action?.record || action;
    }
}

// -----------------------------------------------------------------
// Documents
// -----------------------------------------------------------------

export async function dbPurge(client, databaseID, tenantID) {
    // init action
    let action = new helpers.things.Action('MongoDB Purge');

    try {
        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let records = await collection.deleteMany({});

        action.object = {};
        action.setCompleted();
        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        console.log('error', JSON.stringify(action));
        return action?.record || action;
    }
}

export async function getDocumentCount(client, databaseID, tenantID) {
    const db = client.db(databaseID);
    const collection = db.collection(tenantID);

    // Method 2: Fast, estimated count of the entire collection
    const totalEstimate = await collection.estimatedDocumentCount();

    return totalEstimate;
}

export async function dbGetNested(client, databaseID, tenantID, records) {
    let action = new helpers.things.Action('MongoDB Get nested', records);

    let initialIDs = [];
    let fetchedIDs = []; // ids already fetched
    let toFetchIDs = []; // records to return
    let recordsDB = new helpers.DB(); // records already fetched

    try {
        records = Array.isArray(records) ? records : [records];
        initialIDs = records.map((x) => x?.['@id']);
        toFetchIDs = toFetchIDs.concat(initialIDs);

        while (toFetchIDs.length > 0) {
            let a = await dbGet(
                client,
                databaseID,
                tenantID,
                toFetchIDs,
                false,
            );

            let dbRecords = a.result;
            dbRecords = Array.isArray(dbRecords) ? dbRecords : [dbRecords];
            dbRecords = dbRecords.map((x) => x?.record || x);

            // Add records to recordsDB
            recordsDB.post(dbRecords);

            // add ids to fetch to already fetched
            fetchedIDs = fetchedIDs.concat(toFetchIDs);

            // Reset toFetchIDs
            toFetchIDs = [];

            // Get new ids to fetch
            toFetchIDs = recordsDB.record_ids.filter(
                (x) => !fetchedIDs.includes(x),
            );
        }

        let results = initialIDs.map((x) => recordsDB.get(x));

        action.setCompleted(results);
        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbPatch(client, databaseID, tenantID, records) {
    let action = new helpers.things.Action('MongoDB Patch', helpers.clone(records));


    let tempDB1 = new helpers.DB()
    tempDB1.post(records)

    records = tempDB1.records

    let record_ids = records.map((x) => helpers.record_id(x));

    // Retrieve current db records
    let retrieveCurrentRecordsAction = await dbGet(
        client,
        databaseID,
        tenantID,
        record_ids,
    );
    let currentRecords = retrieveCurrentRecordsAction?.result || [];

    // Add current records to tempDB
    let tempDB = new helpers.DB()
    tempDB.post(currentRecords)
    console.log('jj1', tempDB.records)


    // Patch new records to db
    tempDB.patch(records)

    console.log('jj', tempDB.records)

    // Get updated records from tempDB
    let patchedRecords = tempDB.records


    //

    let a = await dbInsert(client, databaseID, tenantID, patchedRecords);

    let updatedRecords = a?.result

    if (a.isFailed) {
        action.setFailed(a?.error);
        return action;
    }

    action.setCompleted(updatedRecords);

    let result = action?.record || action;

    try {
        result = JSON.parse(JSON.stringify(result));
    } catch {}

    return result;
}

/**
 * Insert records to database. returns list of records updated.
 * @param {*} client 
 * @param {*} databaseID 
 * @param {*} tenantID 
 * @param {*} records 
 * @returns 
 */
export async function dbInsert(client, databaseID, tenantID, records) {


    let initialRecords = helpers.clone(records)

    let action = new helpers.things.Action('MongoDB Insert', helpers.clone(records));

    tenantID = tenantID || 'test';

    records = getFlatRecords(records);

    // Retrieve
    let queries = [];
    for (let r of records) {
        let q = {
            updateOne: {
                filter: { 'data.@id': helpers.record_id(r) },
                update: {
                    $set: {
                        '@type': helpers.record_type(r),
                        '@id': r?.['@id'],
                        data: r,
                        '@annotation.dbModifiedDate': new Date(),
                    },
                    $setOnInsert: {
                        '@annotation.dbCreatedDate': new Date(),
                    },
                },
                upsert: true,
            },
        };
        queries.push(q);
    }

    try {
        let database = client.db(databaseID);
        let collection = database.collection(tenantID);
        let r = await collection.bulkWrite(queries);

        // Get new version of records 
        let a = await dbGet(client, databaseID, tenantID, initialRecords, true)
        let newRecords = a?.result

        // Set action completed
        action.setCompleted(newRecords);

        let result = action?.record || action;

        try {
            result = JSON.parse(JSON.stringify(result));
        } catch {}

        return result;
    } catch (err) {
        action.setFailed(String(err));

        let result = action?.record || action;

        try {
            result = JSON.parse(JSON.stringify(result));
        } catch {}

        return result;
    }
}

export async function dbSearch(
    client,
    databaseID,
    tenantID,
    filter,
    orderBy,
    orderDirection,
    limit,
    offset,
    expand = true,
) {
    // init action
    let action = new helpers.things.Action('MongoDB Search', filter);

    tenantID = tenantID || 'test';

   

    let params = mongoHelpers.standardizeAll({filter, offset, limit, orderBy, orderDirection})
   

    try {
        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        
        let records = await collection
            .find(params.filter)
            .sort(params.sortOptions)
            .skip(params.offset)
            .limit(params.limit)
            .toArray();

        let count = await collection.countDocuments(filter);

        // Clean records
        records = _cleanMongoRecord(records);

        // Expand
        if (expand == true) {
            records = await dbGetNested(client, databaseID, tenantID, records);
            records = records?.result || [];
        }

        // Format result
        let result = {
            '@type': 'ItemList',
            '@id': '_:' + helpers.randomUUID(),
            name: 'Search results',
            numberOfItems: count,
            itemListElement: [],
        };

        let results = [];
        records = Array.isArray(records) ? records : [records];
        for (let [i, r] of records.entries()) {
            let listItem = {
                '@type': 'ListItem',
                '@id': '_: ' + helpers.randomUUID(),
                position: i + offset,
                item: r,
            };

            results.push(listItem);
        }

        result.itemListElement = results;
        action.setCompleted(result);
        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

/**
 *  * Returns documents where the value of any property contains the given value
 * @param {*} client
 * @param {*} databaseID
 * @param {*} tenantID
 * @param {*} valueToSearch
 * @param {*} orderBy
 * @param {*} orderDirection
 * @param {*} limit
 * @param {*} offset
 * @param {*} expand
 * @returns
 */
export async function dbContains(
    client,
    databaseID,
    tenantID,
    valueToSearch,
    orderBy,
    orderDirection,
    limit,
    offset,
    expand = true,
) {
    // init action
    let action = new helpers.things.Action('MongoDB Contains', valueToSearch);

    tenantID = tenantID || 'test';

    let params = mongoHelpers.standardizeAll({ undefined, offset, limit, orderBy, orderDirection})


    try {
        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let data = await collection
            .aggregate([
                // Step 1: Filter documents where 'data' exists
                {
                    $match: {
                        data: { $exists: true, $ne: null },
                    },
                },
                {
                    $match: {
                        $expr: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: {
                                                $reduce: {
                                                    input: {
                                                        $objectToArray: '$data',
                                                    },
                                                    initialValue: [],
                                                    in: {
                                                        $concatArrays: [
                                                            '$$value',
                                                            {
                                                                $cond: {
                                                                    // If property is an array, pass array elements through directly
                                                                    if: {
                                                                        $eq: [
                                                                            {
                                                                                $type: '$$this.v',
                                                                            },
                                                                            'array',
                                                                        ],
                                                                    },
                                                                    then: '$$this.v',
                                                                    else: [
                                                                        '$$this.v',
                                                                    ],
                                                                },
                                                            },
                                                        ],
                                                    },
                                                },
                                            },
                                            as: 'val',
                                            cond: {
                                                $eq: ['$$val', valueToSearch],
                                            },
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $facet: {
                        totalCount: [{ $count: 'count' }],
                        paginatedResults: [
                            { $sort: params.sortOptions },
                            { $skip: params.offset },
                            { $limit: params.limit },
                        ],
                    },
                },
                {
                    $project: {
                        paginatedResults: 1,
                        totalCount: {
                            $ifNull: [
                                { $arrayElemAt: ['$totalCount.count', 0] },
                                0,
                            ],
                        },
                    },
                },
            ])
            .toArray();

        data = data?.[0];

        let records = data?.paginatedResults;
        let count = data?.totalCount;

        // Clean records
        records = _cleanMongoRecord(records);

        // Expand
        if (expand == true) {
            records = await dbGetNested(client, databaseID, tenantID, records);
            records = records?.result || [];
        }

        let result = {
            '@type': 'ItemList',
            '@id': '_:' + helpers.randomUUID(),
            name: 'Search results',
            numberOfItems: count,
            itemListElement: [],
        };

        let results = [];
        records = Array.isArray(records) ? records : [records];
        for (let [i, r] of records.entries()) {
            let listItem = {
                '@type': 'ListItem',
                '@id': '_: ' + helpers.randomUUID(),
                position: i + offset,
                item: r,
            };

            results.push(listItem);
        }

        result.itemListElement = results;
        action.setCompleted(result);
        return action?.record || action;
    } catch (err) {
        console.log('Error dbContains', err)
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbGet(
    client,
    databaseID,
    tenantID,
    record_ids,
    expand = true,
) {
    // init action
    let action = new helpers.things.Action('MongoDB Get', record_ids);

    tenantID = tenantID || 'test';

    record_ids = Array.isArray(record_ids) ? record_ids : [record_ids];

    record_ids = record_ids.map((x) => x?.['@id'] || x);

    record_ids = [ ...new Set(record_ids)]

    let query = record_ids.map((x) => {
        return { 'data.@id': x };
    });
    query = { $or: query };

    try {
        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let records = await collection.find(query).toArray();

        // Clean records
        records = _cleanMongoRecord(records);

        // Expand
        if (expand == true) {
            let a = await dbGetNested(client, databaseID, tenantID, records);
            records = a?.result;
        }

        action.setCompleted(records);

        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbDelete(client, databaseID, tenantID, filter) {
    // init action
    let action = new helpers.things.Action('MongoDB Delete', filter);

    if (typeof filter == 'string') {
        filter = { '@id': filter };
    }

    filter = filter || {};
    for (let k of Object.keys(filter)) {
        filter['data.' + k] = filter[k];
        delete filter[k];
    }

    try {
        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let records = await collection.deleteMany(filter);

        action.object = filter;
        action.setCompleted();
        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

export async function dbDeleteById(client, databaseID, tenantID, record_ids) {
    // init action
    let action = new helpers.things.Action('MongoDB Delete by Id', record_ids);

    record_ids = helpers.toArray(record_ids);

    record_ids = record_ids.map((x) =>
        typeof x == 'string' ? { '@id': x } : x,
    );

    record_ids = record_ids.filter((x) => helpers.record_id(x));

    let filter = {
        $or: record_ids,
    };

    try {
        const database = client.db(databaseID);
        const collection = database.collection(tenantID);

        let records = await collection.deleteMany(filter);

        action.object = filter;
        action.setCompleted();
        return action?.record || action;
    } catch (err) {
        action.setFailed(String(err));
        return action?.record || action;
    }
}

// ------------------------------------------------
// Cleanup
// ------------------------------------------------

function _cleanMongoRecord(record) {
    if (Array.isArray(record) && typeof record != 'string') {
        return record.map((x) => _cleanMongoRecord(x));
    }

    record = record?.['data'];
    return record;
}

/**
 * Return an array of flatten records
 * @param {*} records
 * @returns
 */
function getFlatRecords(records) {
    // init action

    if (helpers.isArray(records)) {
        records = records.map((x) => x?.record ?? x);
    } else {
        records = records?.record ?? records;
    }

    records = helpers.clone(records);

    let db = new helpers.DB();

    records = helpers.toArray(records);
    records = records.map((x) => x?.record || x);

    db.post(records);

    records = db.getRecords(false);

    records = records.map((x) => x?.record || x);

    return records;
}
