const query = require('./index.js');
const moment = require('moment');
const ldfetch = require('ldfetch');

let dq = new query();

//dq.addCatalog('https://datapiloten.be/parking/catalog.ttl');

dq.addDataset('http://leuven.datapiloten.be/parking');

let now = moment().unix();

dq.getInterval(now - 60*60*24*2, now).subscribe(
        data => {},
        error => console.log(error),
        () => console.log('Complete'));