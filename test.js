const query = require('./index.js');

let dq = new query();

dq.addDataset('http://kortrijk.datapiloten.be/parking');
dq.addMDIEntry('http://kortrijk.datapiloten.be/parking', 'http://kortrijk.datapiloten.be/parking/rangegate');

console.time('Get parkings');
dq.getParkings().subscribe(parking => {
        console.log(parking.label);
    },
    (error) => console.log(error),
    () => {
        console.log('Complete!');
        console.timeEnd('Get parkings');
    });
