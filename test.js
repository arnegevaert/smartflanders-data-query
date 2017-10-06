const query = require('./index.js');
const moment = require('moment');

let dq = new query();

dq.addCatalog('https://datapiloten.be/parking/catalog.ttl');

let now = moment().unix();
dq.getInterval(now - 60*60*24*2, now,
    {mode: {zoomLevel: 3}}).subscribe(
        stat => console.log("STAT:", stat),
        error => console.log(error),
        () => console.log('Complete'));