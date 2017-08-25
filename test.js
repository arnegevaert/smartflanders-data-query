const query = require('./index.js');
const moment = require('moment');

let dq = new query();

dq.addCatalog('https://datapiloten.be/parking/catalog.ttl')
  .then(() => {
    dq.getParkings().subscribe(parking => {
      console.log(parking.label, parking.uri);
    },
    (error) => console.log(error),
    () => {
      console.log();
      const from = moment().unix()-60*60*24;
      const to = moment().unix();
      const ds =  dq.getCatalog()[0];
      dq.getDatasetInterval(from, to, ds).subscribe(meas => {
        console.log(meas.parkingUrl, meas.timestamp, meas.value);
      },
      (error) => console.log(error),
      () => {
        console.log('Complete!');
      })
    });
  });
