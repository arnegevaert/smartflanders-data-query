# Smartflanders Data Query
Smartflanders-data-query is a library that lets you query the Smartflanders datasets for historic Linked Open Data. It accepts a simple dataset URL, or a URL to a [DCAT catalog](https://www.w3.org/TR/vocab-dcat/) describing one or more datasets. An example of such a catalog for the Smartflanders datasets can be found [here](https://datapiloten.be/parking/catalog.ttl).

## Installation
For Node.js, smartflanders-data-query comes as an npm package.

``` bash
$ npm install smartflanders-data-query
```
``` js
var query = require('smartflanders-data-query');
```

## Datatypes
The library defines a few models to represent different data structures:

### Parking
``` js
{ label: string,
  uri: string,
  id: string,
  totalSpaces:int,
  datasetUrl: string }
```
- `label`: Contains the [rdfs:label](http://www.w3.org/2000/01/rdf-schema#label) of the parking.
- `uri`: Contains the URI that represents the parking.
- `id`: Contains a generated parking ID, derived from the [rdfs:label](http://www.w3.org/2000/01/rdf-schema#label).
- `totalSpaces`: Contains the total amount of spaces of the parking.
- `datasetUrl`: Contains the URL of the dataset where data of this parking can be found.

### Measurement
``` js
{ timestamp: int,
  parkingUrl: string
  value: int }
```
- `timestamp`: Contains the UNIX timestamp of when this measurement was made.
- `parkingUrl`: Contains the URL that represents the parking of this measurement.
- `value`: Contains the amount of available spaces that was recorded.

## Interface
- `addCatalog(catalog)`: Fetches and interprets a DCAT catalog file, located at the url `catalog`. Datasets are
extracted and added to the internal catalog. Returns a [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) that is resolved when the data was successfully fetched and processed.
- `getCatalog()`: Returns the internal catalog of datasets. This is an array of dataset URLs.
- `addDataset(dataset)`: Adds a literal dataset URL to the internal catalog.
- `getParkings()`: Fetches all parkings that can be found in the datasets of the catalog. Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html), that emits objects of the earlier defined Parking type (see above: Datatypes).
- `getInterval(from, to)`: Gets recorded data for all parkings in all datasets of the internal catalog between `from` and `to` (these arguments are UNIX timestamps). Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits objects of the earlier defined Measurement type (see above: Datatypes).
- `getDatasetInterval(from, to, datasetUrl)`: Gets recorded data for all parkings in a given dataset between `from` and `to` (these arguments are UNIX timestamps). Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits objects of the earlier defined Measurement type (see above: Datatypes).
- `getParkingInterval(from, to, datasetUrl, uri)`: Gets recorded data for a given parking in a given dataset between `from` and `to` (these arguments are UNIX timestamps). Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits objects of the earlier defined Measurement type (see above: Datatypes).

## Example usage
Below are some examples of usages of this library:

### Example 1
This example adds a catalog file, prints the labels of the parkings that are found in this catalog, and then fetches and prints all data from all parkings of the last 24 hours:
``` js
const query = require('smartflanders-data-query');
const moment = require('moment');

let dq = new query();

dq.addCatalog('https://datapiloten.be/parking/catalog.ttl')
  .then(() => {
    dq.getParkings().subscribe(parking => {
      console.log(parking.label);
    },
    (error) => console.log(error),
    () => {
      const from = moment().unix()-60*60*24;
      const to = moment().unix();
      const ds =  dq.getCatalog()[0];
      dq.getInterval(from, to).subscribe(meas => {
        console.log(meas.parkingUrl, meas.timestamp, meas.value);
      },
      (error) => console.log(error),
      () => {
        console.log('Complete!');
      })
    });
  });

```

### Example 2
This example adds a few literal dataset URLs and then prints all parkings that can are found in these datasets:
``` js
const query = require('smartflanders-data-query');

let dq = new query();

dq.addDataset('https://linked.open.gent/parking');
dq.addDataset('https://kortrijk.datapiloten.be/parking');
dq.addDataset('https://leuven.datapiloten.be/parking');

dq.getParkings().subscribe(parking => {
  console.log(parking.label);
},
(error) => console.log(error),
() => console.log('Complete!'));
```
