import { MongoClient } from 'mongodb'

import * as helpers from 'helpers_jsonld'


import * as m from './mongoDbMethods.js'


// ------------------------------------------------------------------------------
// Mongo DB
// ------------------------------------------------------------------------------

// cloudflared access tcp --hostname mongodb.krknapi.com --url localhost:27018


export class MongoDB {
    constructor(uri, tenantID, databaseID) {

        this.url = undefined
        this.port = undefined
        this.userID = undefined
        this.password = undefined
        this._uri = uri
        this.tenantID = tenantID
        this.databaseID = databaseID

        this._client = undefined
        this._dbInitializedFlag = false

        //this.uri = 'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT'
        //this.tenantID = tenantID || "test"

        //this.databaseID = 'n8n'
    }

    get uri() {

        if (this._uri) {
            return this._uri
        }

        let uri = `mongodb://${this.userID}:${this.password}@${this.url}:${this.port || "27017"}/?authMechanism=DEFAULT`
        return uri
    }

    set uri(value) {
        this._uri = value
    }

    async init() {

        if (this._dbInitializedFlag == true) {
            return true
        }
        let initAction = await m.dbInit(this.uri)
        if (initAction.actionStatus == "CompletedActionStatus") {
            this._dbInitializedFlag = true
            this._client = initAction.result?.[0] || initAction.result
        }

        // init background healthcheck
        this.healthCheck()


        //
        return initAction

    }

    async healthCheck(){
        return await m.dbHealthCheck(this._client, this.databaseID, this.tenantID) 
    }

    async getDatabases(){
        return await m.dbSearchDatabases(this._client, this.databaseID)
    }

    async createDatabase(){
        return await m.dbCreateDatabase(this._client, this.databaseID, this.tenantID)
    }

    async getCollections(){
        return await m.getCollections(this._client, this.databaseID)
    }

    async get(record_ids) {
        return await m.dbGet(this._client, this.databaseID, this.tenantID, record_ids, true)
    }

    async search(filter, orderBy, orderDirection, limit, offset) {
        return await m.dbSearch(this._client, this.databaseID, this.tenantID, filter, orderBy, orderDirection, limit, offset, true)
    }

    async post(record) {
        return await m.dbInsert(this._client, this.databaseID, this.tenantID, record)
    }

    async delete(filter) {
        return await m.dbDelete(this._client, this.databaseID, this.tenantID, filter)
    }

    async execute(actionRecord) {
        return await executeAction(this._client, this.databaseID, this.tenantID, actionRecord)
    }

}



export async function executeAction(client, databaseID, tenantID, actionRecord) {


    
    let record_type = helpers.record_type(actionRecord)

    if (record_type == "MoveAction") {
        return await executeMoveAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "MoveUpAction") {
        return await executeMoveUpAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "MoveDownAction") {
        return await executeMoveDownAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "MoveBeforeAction") {
        return await executeMoveBeforeAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "MoveAfterAction") {
        return await executeMoveAfterAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "AppendAction") {
        return await executeAppendAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "PrependAction") {
        return await executePrependAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "InsertAction") {
        return await executeInsertAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "DeleteAction") {
        return await executeDeleteAction(client, databaseID, tenantID, actionRecord)
    }

    if (record_type == "ReplaceAction") {
        return await executeReplaceAction(client, databaseID, tenantID, actionRecord)
    }

     if (record_type == "DuplicateAction") {
        return await executeDuplicateAction(client, databaseID, tenantID, actionRecord)
    }


}


export async function executeMoveAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    if(!itemlist){
        return helpers.things.Action.setFailed(actionRecord, `No itemList provided`)
    }

    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Retrieve item
    let listItem = helpers.getValues(actionRecord, "object")

    // Retrieve position
    let position = helpers.getValue(actionRecord, 'toLocation')

    // helpers
    itemListRecord = helpers.ItemList.move(itemListRecord, listItem, position)
     
    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}

export async function executeMoveUpAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    if(!itemlist){
        return helpers.things.Action.setFailed(actionRecord, `No itemList provided`)
    }

    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Retrieve item
    let listItem = helpers.getValue(actionRecord, "object")

    // helpers
    itemListRecord = helpers.ItemList.moveUp(itemListRecord, listItem)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeMoveDownAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    if(!itemlist){
        return helpers.things.Action.setFailed(actionRecord, `No itemList provided`)
    }

    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Retrieve item
    let listItem = helpers.getValue(actionRecord, "object")

    // helpers
    itemListRecord = helpers.ItemList.moveDown(itemListRecord, listItem)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeMoveBeforeAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    if(!itemlist){
        return helpers.things.Action.setFailed(actionRecord, `No itemList provided`)
    }

    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Retrieve item
    let listItem = helpers.getValue(actionRecord, "object")

    // helpers
    itemListRecord = helpers.ItemList.moveDown(itemListRecord, listItem)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeMoveAfterAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    if(!itemlist){
        return helpers.things.Action.setFailed(actionRecord, `No itemList provided`)
    }

    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Retrieve item
    let listItem = helpers.getValue(actionRecord, "object")

    // helpers
    itemListRecord = helpers.ItemList.moveDown(itemListRecord, listItem)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeAppendAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Add object
    let object = helpers.getValues(actionRecord, "object")

    // helpers
    itemListRecord = helpers.ItemList.append(itemListRecord, object)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executePrependAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Add object
    let object = helpers.getValues(actionRecord, "object")

    // helpers
    itemListRecord = helpers.ItemList.prepend(itemListRecord, object)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeInsertAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Get object
    let objects = helpers.getValues(actionRecord, "object")

    // Get location
    let location = helpers.getValue(actionRecord, "toLocation")

    // helpers
    itemListRecord = helpers.ItemList.insert(itemListRecord, object, location)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}

export async function executeDeleteAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}


    // Get object id

    let objects = helpers.getValues(actionRecord, "object")
    
    for(let object of objects){
        let objectID = helpers.record_id(object)
        itemListRecord = helpers.ItemList.delete(itemListRecord, objectID)
    }

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeReplaceAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Get object
    let replacer = getValue(actionRecord, 'replacer')
    let replacee = getValue(actionRecord, 'replacee')


    // helpers
    itemListRecord = helpers.ItemList.replace(itemListRecord, replacer, replacee)

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}


export async function executeDuplicateAction(client, databaseID, tenantID, actionRecord) {


    // Retrieve itemList record
    let itemlist = helpers.getValue(actionRecord, "targetCollection")
    let itemListRecord = (await m.dbGet(client, databaseID, tenantID, itemlist))?.result 
    itemListRecord = itemListRecord || {"@type": "ItemList", "@id": helpers.record_id(itemlist)}

    // Get object
    let objects = helpers.getValues(actionRecord, "object")
    
    for(let object of objects){
        let objectID = helpers.record_id(object)
        itemListRecord = helpers.ItemList.duplicate(itemListRecord, objectID)
    }

    

    // Save itemList
    let r = await m.dbInsert(client, databaseID, tenantID, itemListRecord)

    // Complete action and return
    actionRecord = helpers.Action.setCompleted(itemListRecord)

    return actionRecord
}
