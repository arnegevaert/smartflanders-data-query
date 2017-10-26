const query = require('./index.js');
const moment = require('moment');
const ldfetch = require('ldfetch');

let dq = new query();

//dq.addCatalog('https://datapiloten.be/parking/catalog.ttl');

dq.addDataset('http://kortrijk.datapiloten.be/parking');

let now = moment().unix();

dq.getParkings(now - 60*60*24*2, now).subscribe(
        data => {console.log(data)},
        error => console.log(error),
        () => console.log('Complete'));