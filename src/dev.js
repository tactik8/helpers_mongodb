import { MongoDB } from './mongodb.js'
import helpers from 'helpers_jsonld'

let URI = 'mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT'




async function test4() {

    let r = {




        "@context":
            "https://schema.org/",




        "@type":
            "Thing",




        "@id":
            "https://www.test.com/thing1",




        "name":
            "thing1",




        "url":
            "https://www.test.com/thing/thing1",




        "other":
            [





                {






                    "@context":
                        "https://schema.org/",






                    "@type":
                        "Thing",






                    "@id":
                        "https://www.test.com/thing11",






                    "name":
                        "thing1",






                    "url":
                        "https://www.test.com/thing/thing11"





                },





                {






                    "@context":
                        "https://schema.org/",






                    "@type":
                        "Thing",






                    "@id":
                        "https://www.test.com/thing12",






                    "name":
                        "thing1",






                    "url": "https://www.test.com/thing/thing12"

                }




            ]



    }

    let databaseID = "n8n"
    let tenantID = "stash"

    let db = await MongoDB.getDB(URI, databaseID, tenantID)



    let t = await db.post(r)
    console.log('t', t)
}
test4()
