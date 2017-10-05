const query = require('./index.js');
const moment = require('moment');

let dq = new query();

dq.addDataset('http://kortrijk.datapiloten.be/parking');
dq.addMDIEntry('http://kortrijk.datapiloten.be/parking',
    'http://kortrijk.datapiloten.be/parking/rangegate');

let now = moment().unix();
dq.getInterval(now - 60*60*24*2, now,
    {mode: {precision: "day"}}).subscribe(
        stat => console.log("STAT", stat),
        error => console.log(error),
        () => console.log('Complete'));