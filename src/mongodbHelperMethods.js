import { _h } from 'helpers_jsonld';

let DEFAULT_LIMIT = 20



export function standardizeAll({filter, offset, limit, orderBy, orderDirection}){


    filter = standardizefilter(filter)
    offset = standardizeOffset(offset)
    limit = standardizeLimit(limit)
    let sortOptions = getSortOptions(orderBy, orderDirection)

    return { filter, offset, limit, sortOptions }

}


function standardizeOffset(offset){



    offset = Number(offset)

    if (isNaN(offset)) {
        offset = 0
    }

    return offset
}


function standardizeLimit(limit){



    limit = Number(limit)

    if (isNaN(limit)) {
        limit = DEFAULT_LIMIT
    }

    return limit
}


/**
 * Standardize a filter object
 * @param {*} filter
 * @returns
 */
export function standardizefilter(filter) {
    if (!filter) {
        return {};
    }

    //
    try {
        filter = JSON.parse(JSON.stringify(filter));
    } catch (err) {
        console.error('Error: filter is not json object', filter);
        return {};
    }

    // adjust for array
    for (let k of Object.keys(filter)) {
        let value = filter[k];
        if (Array.isArray(value)) {
            filter[k] = { $all: value };
        }
    }

    // Adjust for data.x
    let newfilter = {};
    for (let k of Object.keys(filter)) {
        let standardizedK = standardizePropertyId(k);
        if(k){
            newfilter[standardizedK] = filter[k];
        }
    }
    filter = newfilter;

    return filter;
}

/**
 * Converts orderBy and orderDirection to a sortOptions object for mongodb
 * @param {*} orderBy
 * @param {*} orderDirection
 * @returns
 */

export function getSortOptions(orderBy, orderDirection) {
    // Expand
    let params = expandSortParameters(
        orderBy,
        orderDirection,
    );

    orderBy = _h.toArray(params?.orderBy)
    orderDirection =  _h.toArray(params?.orderDirection)

    // Standardize
    orderBy = orderBy.map((x) => standardizePropertyId(x));
    orderDirection = orderDirection.map((x) => standardizeOrderDirection(x));

    // Build object
    let sortOptions = {};
    for (let i = 0; i < orderBy.length; i++) {
        sortOptions[orderBy?.[i]] = orderDirection?.[i] || 1;
    }

    return sortOptions;
}

/**
 * Expand sort parameters, inserting default values if required
 * @param {*} orderBy
 * @param {*} orderDirection
 */
function expandSortParameters(orderBy, orderDirection) {

    if(!orderBy){
        return { orderBy: ['data.@id'], orderDirection: [1] }
    }


    let sortedOrderBy = [];

    let sortedOrderDirection = [];

    orderBy = _h.toArray(orderBy);
    orderDirection = _h.toArray(orderDirection);

    // Expand if array
    for (let i = 0; i < orderBy.length; i++) {
        let ob1 = orderBy?.[i];
        let od1 = orderDirection?.[i];

        // Expand if separated by commas
        ob1 = ob1.split(',');
        od1 = od1.split(',');

        for (let i2 = 0; i2 < ob1.length; i2++) {
            let ob2 = ob1?.[i2];
            let od2 = od1?.[i1] || od1?.[0] || 1; // Sets defaults to first or to 1 if missing

            sortedOrderBy.push(ob2);
            sortedOrderDirection.push(od2);
        }
    }

    orderBy = sortedOrderBy;
    orderDirection = sortedOrderDirection;

    if(orderBy.length ==0){
     
        return { orderBy: ['data.@id'], orderDirection: [1] }
    
    }

    return { orderBy, orderDirection };
}

function standardizeOrderDirection(orderDirection) {
    // Deal with null
    if (!orderDirection) {
        return 1;
    }

    // deal with already valid
    if (orderDirection === 1 || orderDirection === -1) {
        return orderDirection;
    }

    // Deal with number as string
    let convertedOrderDirection = Number(orderDirection);
    if (convertedOrderDirection === 1 || convertedOrderDirection === -1) {
        return convertedOrderDirection;
    }

    // Deal with string
    if (h.isString(orderDirection)) {
        orderDirection = orderDirection.trim();
        orderDirection = orderDirection.toLowerCase();
        orderDirection = orderDirection.startsWith('asc') ? 1 : orderDirection;
        orderDirection = orderDirection.startsWith('desc')
            ? -1
            : orderDirection;

        if (orderDirection === 1 || orderDirection === -1) {
            return orderDirection;
        }
    }

    return 1;
}

/**
 * Adds data. prefix unless starts with _
 * @param {*} propertyID 
 * @returns 
 */
function standardizePropertyId(propertyID) {
    let p = propertyID;

    if(!p){
        return undefined
    }

    if(_h.isArray(p) && p.length ==1 ){
        p = p[0]
    }

    if(_h.isString(p) == false){
        return undefined
    }

    p = p.trim();

    if (p.startsWith('_')) {
        return p;
    }

    if (!p.startsWith('data.')) {
        p = 'data.' + p;
    }

    return p;
}
