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
The library defines a few models to represent different data structures. The structure of these
models is based on the [JSON_LD](https://json-ld.org/) standard:

### Parking
``` js
{ label: string,
  '@id': string,
  totalSpaces:int,
  dataset: {'@id': string} }
```
- `label`: Contains the [rdfs:label](http://www.w3.org/2000/01/rdf-schema#label) of the parking.
- `@id`: Contains the URI that represents the parking.
- `totalSpaces`: Contains the total amount of spaces of the parking.
- `dataset`: Contains the URI of the dataset where data of this parking can be found.

### Measurement
``` js
{ timestamp: int,
  parking: {'@id': string},
  value: int }
```
- `timestamp`: Contains the UNIX timestamp of when this measurement was made.
- `parking`: Contains the URI that represents the parking of this measurement.
- `value`: Contains the amount of available spaces that was recorded.

### Statistic
``` js
{ init: int,
  final: int,
  parking: {'@id': string},
  mean: double,
  variance: double,
  firstQuartile: double,
  thirdQuartile: double,
  median: double }
```
This object represent a statistical summary of the occupancy of a certain parking over a certain interval.
- `init`: Contains the UNIX timestamp of the beginning of the interval.
- `final`: Contains the UNIX timestamp of the end of the interval.
- `parking`: Contains the URI that represents the parking of this statistical summary.
- `mean`: Contains the mean of the absolute occupancy of the parking over the interval.
- `variance`: Contains the variance of the absolute occupancy of the parking over the interval.
- `firstQuartile`: Contains the first quartile of the absolute occupancy of the parking over the interval.
- `thirdQuartile`: Contains the third quartile of the absolute occupancy of the parking over the interval.
- `median`: Contains the median of the absolute occupancy of the parking over the interval.

## Interface
### Config
Some functions have an optional argument `conf`. This argument is only relevant for datasets that have an MDI entry,
and specifies how deep to traverse the MDI tree. Possible configurations are:
- `precision`
    - `precise`: Traverse the MDI tree down to the leaf level, fetching all exact data in the interval
    - `day`: Traverse the MDI tree down to one level above leaf level, this corresponds to statistical summaries per day.
- `zoomLevel: int`: Traverse the MDI tree `zoomLevel` levels deep.

### Functions
- `addCatalog(catalog)`: Fetches and interprets a DCAT catalog file, located at the url `catalog`. Datasets are
extracted and added to the internal catalog. Any [MDI](http://semweb.datasciencelab.be/ns/multidimensional-interface/)
entry points are also detected (by looking for the predicate `https://w3id.org/multidimensional-interface/ontology#hasRangeGate`)
and added to a separate internal catalog. These MDI entry points are automatically used when possible to increase performance,
and can also be used to view the time series at a certain zoom level (see above).
Returns a [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) that is resolved when the data was successfully fetched and processed.
- `getCatalog()`: Returns the internal catalog of datasets. This is an array of dataset URLs.
- `addDataset(dataset)`: Adds a literal dataset URL to the internal catalog.
- `getParkings()`: Fetches all parkings that can be found in the datasets of the catalog. 
MDI entry points for datasets are used if present to improve performance. 
Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html), that emits objects of the earlier defined Parking type (see above: Datatypes).
- `getInterval(from, to, conf={mode: {precision: 'precise'}})`: Gets recorded data for all parkings in all datasets of the internal catalog between `from` and `to` (these arguments are UNIX timestamps). 
`conf` is used as defined above.
Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits objects of the earlier defined Measurement type (see above: Datatypes).
- `getDatasetInterval(from, to, datasetUrl, conf={mode: {precision: 'precise'}})`: 
Gets recorded data for all parkings in a given dataset between `from` and `to` (these arguments are UNIX timestamps).
`conf` is used as defined above.
Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits objects of the earlier defined Measurement type (see above: Datatypes).
- `getParkingInterval(from, to, datasetUrl, uri, conf={mode: {precision: 'precise'}})`: 
Gets recorded data for a given parking in a given dataset between `from` and `to` (these arguments are UNIX timestamps). 
`conf` is used as defined above.
Returns an [Observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits objects of the earlier defined Measurement type (see above: Datatypes).
- `addMDIEntry(dataset, rangegate)`: Adds an MDI entry point at URL `rangegate` for dataset `dataset` to the internal catalog.
- `hasMDIEntry(dataset)`: Returns `true` if an MDI entry for `dataset` is present.
- `getMDIEntry(dataset)`: Gets the MDI entry for `dataset` if present.

## Example usage
Below are some examples of usages of this library:

### Example 1
This example adds a catalog file, prints the URIs of the parkings that are found in this catalog, and then fetches and prints all data from all parkings of the last 24 hours:
``` js
const query = require('smartflanders-data-query');
const moment = require('moment');

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

```

### Example 2
This example adds a few literal dataset URLs and then prints all parkings that can be found in these datasets:
``` js
const query = require('smartflanders-data-query');

let dq2 = new query();

dq2.addDataset('https://linked.open.gent/parking');
dq2.addDataset('https://kortrijk.datapiloten.be/parking');
dq2.addDataset('https://leuven.datapiloten.be/parking');

dq2.getParkings().subscribe(parking => {
        console.log(parking);
    },
    (error) => console.log(error),
    () => console.log('Complete!'));
```

### Example 3
This example adds an MDI entry to the internal store that corresponds to the added dataset. This MDI entry point is
then used to fetch aggregated data. The `{mode: {precision: "day"}}` argument ensures the data will be aggregated
on day level, meaning the statistics will be calculated over the span of 1 day.
``` js
const query = require('smartflanders-data-query');
const moment = require('moment');

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
```

### Example 4
In this example, we interpret a DCAT catalog again and fetch aggregated statistical data on zoom level 3 (the corresponding
timespan over which the data is aggregated depends on the publisher). Note that we make the assumption that the DCAT
catalog contains MDI entries for all datasets. Any datasets in the catalog that don't have a corresponding MDI entry
will be queried directly, i.e. the exact data will be fetched over this interval rather than the statistical data.
```
const query = require('smartflanders-data-query');
const moment = require('moment');

let dq4 = new query();
dq4.addCatalog('https://datapiloten.be/parking/catalog.ttl');

let now = moment().unix();
dq4.getInterval(now - 60*60*24*2, now,
    {mode: {zoomLevel: 3}}).subscribe(
        stat => console.log("STAT:", stat),
        error => console.log(error),
        () => console.log('Complete'));
```