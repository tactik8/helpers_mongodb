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

    if(a_init.isCompleted == false){
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

    console.log('a', action)



    return


}



test()
// testCollection()