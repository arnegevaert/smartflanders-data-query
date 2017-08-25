const query = require('./index.js');
const moment = require('moment');

let dq = new query();

dq.addDataset('https://linked.open.gent/parking');
dq.addDataset('https://kortrijk.datapiloten.be/parking');
dq.addDataset('https://leuven.datapiloten.be/parking');

dq.getParkings().subscribe(parking => {
  console.log(parking.label);
},
(error) => console.log(error),
() => console.log('Complete!'));
