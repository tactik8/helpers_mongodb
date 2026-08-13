import { MongoDB } from './mongodb.js'
import * as helpers from 'helpers_jsonld'

let URI = 'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT'




export async function test() {

    //let record = helpers.testRecord()


    let db = new MongoDB()
    db.uri = URI

    db.databaseID = "n8n"
    db.tenantID = "test"


    // init db
    let a_init = await db.init()

    if (a_init.isCompleted == false) {
        console.log('Error init')
    }





    let filter = undefined
    let orderBy = undefined
    let orderDirection = undefined
    let limit = undefined
    let offset = undefined



    let l = {
        "@type": "ItemList",
        "@id": "https://www.test.com/listRecord3"
    }

    let t = {
        "@type": "Thing",
        "@id": "https://www.test.com/thing1",
        "name": "thing1"
    }

    l = helpers.things.ItemList.append(l, t)


    //await db.post(l)


    let action = await db.get("https://www.test.com/listRecord3")

    console.log('a', JSON.stringify(action, null, 4))



    return


}




async function test2() {

    let db = new MongoDB()
    db.uri = URI

    db.databaseID = "n8n"
    db.tenantID = "test"


    // init db
    let a_init = await db.init()

    if (a_init.isCompleted == false) {
        console.log('Error init')
    }

    let r


    let baseRecord = helpers.records.ItemList(5)
    baseRecord['@id'] = "https://www.test.com/testlist1#itemlist"
    let record_id = helpers.record_id(baseRecord)

    await db.post(baseRecord)


    let itemRecord = baseRecord.itemListElement[2]
    let itemRecord_id = helpers.record_id(itemRecord)


    //console.log(JSON.stringify(r.result, null, 4))

    let action

    let items

    action = {
        "@type": "AppendAction",
        "targetCollection": { "@id": record_id },
        "object": {
            "@id": "thing_append",
            "@type": "Thing",
            "name": "thing_append"
        }
    }


    action = {
        "@type": "MoveAction",
        "targetCollection": { "@id": record_id },
        "object": { "@id": itemRecord_id },
        "toLocation": 1
    }

    await db.execute(action)
    r = await db.get(record_id)
    items = r.result.itemListElement.map(x => x?.position + " - " + x?.item?.name)
    console.log('Move', items)


    return


    await db.execute(action)
    r = await db.get(record_id)
    items = r.result.itemListElement.map(x => x?.position + " - " + x?.item?.name)
    console.log('append', items)



    action = {
        "@type": "DuplicateAction",
        "targetCollection": { "@id": record_id },
        "object": { "@id": itemRecord_id }
    }


    await db.execute(action)
    r = await db.get(record_id)
    items = r.result.itemListElement.map(x => x?.position + " - " + x?.item?.name)
    console.log('Duplicate', items)



    return
    action = {
        "@type": "MoveDownAction",
        "targetCollection": { "@id": record_id },
        "object": { "@id": itemRecord_id }
    }

    await db.execute(action)
    r = await db.get(record_id)
    items = r.result.itemListElement.map(x => x?.position + " - " + x?.item?.name)
    console.log('MoveDown', items)


    action = {
        "@type": "MoveAction",
        "toLocation": 0,
        "targetCollection": { "@id": record_id },
        "object": { "@id": itemRecord_id }
    }
    await db.execute(action)
    r = await db.get(record_id)
    items = r.result.itemListElement.map(x => x?.position + " - " + x?.item?.name)
    console.log('Move', items)







    return r

}



async function test3() {

    let db = new MongoDB()
    db.uri = URI

    db.databaseID = "n8n"
    db.tenantID = "stash"


    // init db
    let a_init = await db.init()

    if (a_init.isCompleted == false) {
        console.log('Error init')
    }


    let filter = {"@type": "VideoObject"}

    let r = await db.search(filter, undefined, undefined, 10, 20)

    console.log('zz', JSON.stringify(r, null, 4))
    console.log(r.result.numberOfItems)

}


test3()
