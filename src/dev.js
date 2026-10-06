import { MongoDB } from "./mongodb.js";
import helpers from "helpers_jsonld";

let URI =
  "mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT";

async function test4() {
  let URI =
    "mongodb://tactik8:Temp4now@192.168.2.243:27017/?authMechanism=DEFAULT";

  let databaseID = "unitTestlibraryHelpers";
  let tenantID = "unitTestlibraryHelpersTenant0";

  let db = await MongoDB.getDB(URI, databaseID, tenantID);

  let record = {
    "@type": "Thing",
    "@id": "https://www.test.com/thing1#thing",
    name: "thing1",
    other: {
      "@type": "ItemList",
      "@id": "https://www.test.com/thing2#thing",
      name: "thing2",
    },
  };

  let action = await db.post(record);

  console.log('aaaa', action.result)
  //action = await db.appendItem(record, item)


  let a = await db.related( {"@id": "https://www.test.com/thing2#thing"})



  console.log('a', JSON.stringify(a.result, null, 4))
}
test4();
