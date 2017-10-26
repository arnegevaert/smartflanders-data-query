const query = require('./index.js');
const moment = require('moment');

// Example 1

let dq1 = new query();

dq1.addCatalog('https://datapiloten.be/parking/catalog.ttl')
    .then(() => {
        dq1.getParkings().subscribe(parking => {
                console.log(parking.label);
            },
            (error) => console.log(error),
            () => {
                const from = moment().unix()-60*60*24;
                const to = moment().unix();
                const ds =  dq1.getCatalog()[0];
                dq1.getInterval(from, to).subscribe(meas => {
                        console.log(meas.parking['@id'], meas.timestamp, meas.value);
                    },
                    (error) => console.log(error),
                    () => {
                        console.log('Complete!');
                    })
            });
    });

// Example 2

let dq2 = new query();

dq2.addDataset('https://linked.open.gent/parking');
dq2.addDataset('https://kortrijk.datapiloten.be/parking');
dq2.addDataset('https://leuven.datapiloten.be/parking');

dq2.getParkings().subscribe(parking => {
        console.log(parking);
    },
    (error) => console.log(error),
    () => console.log('Complete!'));

// Example 3

let dq3 = new query();

dq3.addDataset('http://leuven.datapiloten.be/parking');
dq3.addMDIEntry('http://leuven.datapiloten.be/parking',
    'http://leuven.datapiloten.be/parking/rangegate');

let now = moment().unix();
dq3.getInterval(now - 60*60*24*2, now,
    {mode: {precision: "day"}}).subscribe(
    stat => console.log("STAT:", stat),
    error => console.log(error),
    () => console.log('Complete'));

// Example 4

let dq4 = new query();
let now4 = moment().unix();

dq4.addCatalog('https://datapiloten.be/parking/catalog.ttl').then(() => {
    dq4.getInterval(now4 - 60*60*24*2, now4,
        {mode: {zoomLevel: 3}}).subscribe(
        stat => console.log("STAT:", stat),
        error => console.log(error),
        () => console.log('Complete'));
});