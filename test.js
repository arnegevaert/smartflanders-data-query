const query = require('./index.js');

let dq = new query();
dq.addCatalog('https://datapiloten.be/parking/catalog.ttl').then(() => {
  console.log(dq.catalog);
});
