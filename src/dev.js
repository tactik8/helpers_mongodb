import { MongoDB } from './mongodb.js'
import helpers from 'helpers_jsonld'

let URI = 'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT'




async function test4() {


    let databaseID = "unitTestn8n"
    let tenantID = "unitTestn8n1"

    let db = await MongoDB.getDB(URI, databaseID, tenantID)



    let t = await db.search({})



    console.log('t', t)
}
test4()
