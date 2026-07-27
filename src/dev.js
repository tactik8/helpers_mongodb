import { MongoDB } from './mongodb.js'

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




    let action = await db.get("https://www.test.com/listRecord3")

    console.log('a', action.result)

    console.log('pp')


    return


}



test()
// testCollection()